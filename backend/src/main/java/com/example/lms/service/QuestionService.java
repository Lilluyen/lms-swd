package com.example.lms.service;

import com.example.lms.dto.AnswerRequest;
import com.example.lms.dto.QuestionGenerationRequest;
import com.example.lms.dto.QuestionRequest;
import com.example.lms.entity.Answer;
import com.example.lms.entity.Question;
import com.example.lms.entity.User;
import com.example.lms.integration.GeminiProxy;
import com.example.lms.repository.AnswerRepository;
import com.example.lms.repository.QuestionRepository;
import com.example.lms.repository.QuizQuestionRepository;
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

  private final QuestionRepository questions;
  private final AnswerRepository answers;
  private final QuizQuestionRepository quizQuestions;
  private final SupportService support;
  private final QuestionGenerationService generation;
  private final GeminiProxy geminiProxy;

  public QuestionService(
    QuestionRepository questions,
    AnswerRepository answers,
    QuizQuestionRepository quizQuestions,
    SupportService support,
    QuestionGenerationService generation,
    GeminiProxy geminiProxy
  ) {
    this.questions = questions;
    this.answers = answers;
    this.quizQuestions = quizQuestions;
    this.support = support;
    this.generation = generation;
    this.geminiProxy = geminiProxy;
  }

  @Transactional(readOnly = true)
  public List<Map<String, Object>> list(User teacher) {
    return questions.findByTeacherId(teacher.id).stream().map(this::view).toList();
  }

  public Map<String, Object> create(User teacher, QuestionRequest input) {
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
    List<QuestionRequest> inputs
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
    QuestionRequest input
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

  public Object generate(QuestionGenerationRequest input, User teacher) {
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
      geminiProxy.generateContent(
        support.text(topic, 3, 200, "Chủ đề"),
        kind == null ? "lesson" : kind
      )
    );
  }

  private void apply(Question question, QuestionRequest input) {
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

  private void replaceAnswers(Question question, List<AnswerRequest> inputs) {
    answers.findByQuestionId(question.id).forEach(answers::delete);
    for (AnswerRequest input : inputs) {
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
