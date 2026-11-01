package com.example.lms.service;

import com.example.lms.dto.AnswerInput;
import com.example.lms.dto.Generate;
import com.example.lms.dto.QuestionInput;
import com.example.lms.entity.Answer;
import com.example.lms.entity.Question;
import com.example.lms.entity.User;
import com.example.lms.integration.Integrations;
import com.example.lms.repository.AnswerRepo;
import com.example.lms.repository.QuestionRepo;
import com.example.lms.repository.QuizQuestionRepo;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Question-bank use cases and persistence orchestration. */
@Service
@Transactional
public class QuestionService {

  private final QuestionRepo questions;
  private final AnswerRepo answers;
  private final QuizQuestionRepo quizQuestions;
  private final SupportService support;
  private final QuestionGenerationService generation;
  private final Integrations integrations;

  public QuestionService(
    QuestionRepo questions,
    AnswerRepo answers,
    QuizQuestionRepo quizQuestions,
    SupportService support,
    QuestionGenerationService generation,
    Integrations integrations
  ) {
    this.questions = questions;
    this.answers = answers;
    this.quizQuestions = quizQuestions;
    this.support = support;
    this.generation = generation;
    this.integrations = integrations;
  }

  @Transactional(readOnly = true)
  public List<Map<String, Object>> list(User teacher) {
    return questions.findByTeacherId(teacher.id).stream().map(this::view).toList();
  }

  public Map<String, Object> create(User teacher, QuestionInput input) {
    support.validateQuestion(input);
    Question question = new Question();
    question.teacher = teacher;
    apply(question, input);
    questions.save(question);
    replaceAnswers(question, input.answers());
    return view(question);
  }

  public List<Map<String, Object>> createAll(
    User teacher,
    List<QuestionInput> inputs
  ) {
    if (inputs == null || inputs.isEmpty() || inputs.size() > 20)
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Chọn từ 1 đến 20 câu hỏi để lưu"
      );
    return inputs.stream().map(input -> create(teacher, input)).toList();
  }

  public Map<String, Object> update(
    Long id,
    User teacher,
    QuestionInput input
  ) {
    Question question = owned(id, teacher);
    support.validateQuestion(input);
    requireUnused(id, "Câu hỏi đã gắn vào quiz. Tạo bản sao để giữ nguyên đề và kết quả cũ.");
    apply(question, input);
    questions.save(question);
    replaceAnswers(question, input.answers());
    return view(question);
  }

  public void delete(Long id, User teacher) {
    Question question = owned(id, teacher);
    requireUnused(id, "Question belongs to a quiz");
    answers.findByQuestionId(id).forEach(answers::delete);
    questions.delete(question);
  }

  public Object generate(Generate input, User teacher) {
    return generation.generate(input, teacher);
  }

  @Transactional(readOnly = true)
  public Object banks(User teacher) {
    return support.banks(teacher);
  }

  public Map<String, String> generateContent(
    String topic,
    String kind,
    User teacher
  ) {
    // The user parameter deliberately makes authorization explicit at this boundary.
    if (teacher == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    return Map.of(
      "text",
      integrations.generateContent(
        support.text(topic, 3, 200, "Chủ đề"),
        kind == null ? "lesson" : kind
      )
    );
  }

  private void apply(Question question, QuestionInput input) {
    question.bank = support.bank(question.teacher, input.subject());
    question.subject = input.subject();
    question.content = input.content();
    question.difficulty = input.difficulty();
    question.explanation = input.explanation();
  }

  private Question owned(Long id, User teacher) {
    Question question = questions.findById(id).orElseThrow();
    if (!question.teacher.id.equals(teacher.id)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN
    );
    return question;
  }

  private void requireUnused(Long id, String message) {
    if (quizQuestions.existsByQuestionId(id))
      throw new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private void replaceAnswers(Question question, List<AnswerInput> inputs) {
    answers.findByQuestionId(question.id).forEach(answers::delete);
    for (AnswerInput input : inputs) {
      Answer answer = new Answer();
      answer.question = question;
      answer.content = input.content();
      answer.correct = input.correct();
      answers.save(answer);
    }
  }

  private Map<String, Object> view(Question question) {
    return Map.of(
      "question",
      question,
      "answers",
      answers.findByQuestionId(question.id)
    );
  }
}
