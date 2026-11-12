package com.example.lms.service;

import com.example.lms.dto.QuestionGenerationRequest;
import com.example.lms.dto.QuizRequest;
import com.example.lms.dto.QuizSubmissionRequest;
import com.example.lms.entity.Answer;
import com.example.lms.entity.Question;
import com.example.lms.entity.Quiz;
import com.example.lms.entity.QuizAnswer;
import com.example.lms.entity.QuizQuestion;
import com.example.lms.entity.QuizResult;
import com.example.lms.entity.User;
import com.example.lms.integration.GeminiProxy;
import com.example.lms.repository.AnswerRepository;
import com.example.lms.repository.QuestionRepository;
import com.example.lms.repository.QuizAnswerRepository;
import com.example.lms.repository.QuizQuestionRepository;
import com.example.lms.repository.QuizRepository;
import com.example.lms.repository.QuizResultRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Owns the quiz use cases from the class diagram: teacher management, practice
 * generation, access checks, attempt grading and result projection.
 */
@Service
@Transactional
public class QuizService {

  private final QuizRepository quizzes;
  private final QuizQuestionRepository quizQuestions;
  private final QuizResultRepository results;
  private final QuizAnswerRepository quizAnswers;
  private final QuestionRepository questions;
  private final AnswerRepository answers;
  private final GeminiProxy geminiProxy;
  private final SupportService support;

  public QuizService(
    QuizRepository quizzes,
    QuizQuestionRepository quizQuestions,
    QuizResultRepository results,
    QuizAnswerRepository quizAnswers,
    QuestionRepository questions,
    AnswerRepository answers,
    GeminiProxy geminiProxy,
    SupportService support
  ) {
    this.quizzes = quizzes;
    this.quizQuestions = quizQuestions;
    this.results = results;
    this.quizAnswers = quizAnswers;
    this.questions = questions;
    this.answers = answers;
    this.geminiProxy = geminiProxy;
    this.support = support;
  }

  public Quiz create(QuizRequest input, User teacher) {
    validate(input, teacher);
    Quiz quiz = new Quiz();
    apply(quiz, input, teacher);
    quizzes.save(quiz);
    replaceQuestions(quiz, input.questionIds(), teacher);
    return quiz;
  }

  public Quiz update(Long id, QuizRequest input, User teacher) {
    Quiz quiz = ownedBy(id, teacher);
    requireNoAttempts(id, "Quiz đã có lượt làm. Hãy tạo quiz mới để bảo toàn kết quả.");
    validate(input, teacher);
    apply(quiz, input, teacher);
    replaceQuestions(quiz, input.questionIds(), teacher);
    return quizzes.save(quiz);
  }

  public void delete(Long id, User teacher) {
    Quiz quiz = ownedBy(id, teacher);
    requireNoAttempts(id, "Quiz đã có lượt làm, không thể xóa.");
    quizQuestions.findByQuizIdOrderByPosition(id).forEach(quizQuestions::delete);
    quizzes.delete(quiz);
  }

  public Quiz generatePractice(QuestionGenerationRequest input, User student) {
    List<Map<String, Object>> drafts = geminiProxy.generateParsed(
      input.subject(),
      input.topic(),
      input.difficulty(),
      Math.max(1, Math.min(input.quantity(), 10))
    );
    Quiz quiz = new Quiz();
    quiz.title = "Practice: " + input.topic();
    quiz.subject = input.subject();
    quiz.owner = student;
    quizzes.save(quiz);

    int position = 0;
    for (Map<String, Object> raw : drafts) {
      Question question = generatedQuestion(raw, input, student);
      QuizQuestion link = new QuizQuestion();
      link.quiz = quiz;
      link.question = question;
      link.position = position++;
      quizQuestions.save(link);
    }
    return quiz;
  }

  @Transactional(readOnly = true)
  public List<Quiz> listVisible(User user) {
    if ("TEACHER".equals(user.role)) return quizzes.findByOwnerId(user.id);
    List<Quiz> visible = new ArrayList<>(quizzes.findByOwnerRole("TEACHER"));
    visible.addAll(quizzes.findByOwnerId(user.id));
    return visible;
  }

  @Transactional(readOnly = true)
  public Map<String, Object> detail(Long id, User user) {
    Quiz quiz = accessible(id, user);
    List<Map<String, Object>> items = quizQuestions
      .findByQuizIdOrderByPosition(id)
      .stream()
      .map(link -> questionView(link.question))
      .toList();
    return Map.of("quiz", quiz, "questions", items);
  }

  @Transactional(readOnly = true)
  public Map<String, Object> start(Long id, User student) {
    Quiz quiz = accessible(id, student);
    return Map.of("durationMinutes", quiz.durationMinutes);
  }

  public QuizResult submit(
    Long id,
    QuizSubmissionRequest submission,
    User student,
    Instant startedAt
  ) {
    Quiz quiz = accessible(id, student);
    if (startedAt == null) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Hãy bắt đầu quiz trước khi nộp"
    );
    if (
      Instant.now().isAfter(startedAt.plusSeconds(quiz.durationMinutes * 60L + 30))
    ) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Đã hết thời gian làm bài"
    );
    if (submission.choices() == null) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Thiếu đáp án"
    );

    List<QuizQuestion> links = quizQuestions.findByQuizIdOrderByPosition(id);
    if (links.isEmpty()) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Quiz is empty"
    );
    QuizResult result = new QuizResult();
    result.quiz = quiz;
    result.student = student;
    result.total = links.size();
    result.startedAt = startedAt;
    result.completedAt = Instant.now();
    results.save(result);

    int score = 0;
    for (QuizQuestion link : links) {
      List<Answer> choices = answers.findByQuestionId(link.question.id);
      Answer chosen = choices
        .stream()
        .filter(answer -> answer.id.equals(submission.choices().get(link.question.id)))
        .findFirst()
        .orElse(null);
      if (chosen != null && chosen.correct) score++;
      quizAnswers.save(answerSnapshot(result, link.question, choices, chosen));
    }
    result.score = score;
    return results.save(result);
  }

  @Transactional(readOnly = true)
  public List<QuizResult> results(User student) {
    return results.findByStudentIdOrderByCompletedAtDesc(student.id);
  }

  @Transactional(readOnly = true)
  public Map<String, Object> result(Long id, User student) {
    QuizResult result = results.findById(id).orElseThrow();
    if (!result.student.id.equals(student.id)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN
    );
    List<Map<String, Object>> answerViews = quizAnswers
      .findByResultId(id)
      .stream()
      .map(this::resultAnswerView)
      .toList();
    return Map.of("result", result, "answers", answerViews);
  }

  private void validate(QuizRequest input, User teacher) {
    support.text(input.title(), 3, 200, "Tiêu đề quiz");
    if (
      input.durationMinutes() < 1 ||
      input.durationMinutes() > 180 ||
      input.questionIds() == null ||
      input.questionIds().isEmpty() ||
      new HashSet<>(input.questionIds()).size() != input.questionIds().size()
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Quiz cần câu hỏi không trùng và thời gian 1–180 phút"
    );
    input.questionIds().forEach(questionId -> ownedQuestion(questionId, teacher));
  }

  private void apply(Quiz quiz, QuizRequest input, User owner) {
    quiz.title = input.title().trim();
    quiz.subject = input.subject();
    quiz.durationMinutes = input.durationMinutes();
    quiz.owner = owner;
  }

  private void replaceQuestions(Quiz quiz, List<Long> questionIds, User teacher) {
    quizQuestions
      .findByQuizIdOrderByPosition(quiz.id)
      .forEach(quizQuestions::delete);
    int position = 0;
    for (Long questionId : questionIds) {
      QuizQuestion link = new QuizQuestion();
      link.quiz = quiz;
      link.question = ownedQuestion(questionId, teacher);
      link.position = position++;
      quizQuestions.save(link);
    }
  }

  private Question generatedQuestion(
    Map<String, Object> raw,
    QuestionGenerationRequest input,
    User student
  ) {
    Question question = new Question();
    question.teacher = student;
    question.aiGenerated = true;
    question.bank = support.bank(student, input.subject());
    question.subject = input.subject();
    question.difficulty = input.difficulty();
    question.content = String.valueOf(raw.get("content"));
    question.explanation = String.valueOf(raw.getOrDefault("explanation", ""));
    questions.save(question);
    Object rawAnswers = raw.get("answers");
    if (rawAnswers instanceof List<?> list) {
      for (Object item : list) {
        if (!(item instanceof Map<?, ?> rawAnswer)) continue;
        Answer answer = new Answer();
        answer.question = question;
        answer.content = String.valueOf(rawAnswer.get("content"));
        answer.correct = Boolean.TRUE.equals(rawAnswer.get("correct"));
        answers.save(answer);
      }
    }
    return question;
  }

  private Quiz ownedBy(Long id, User owner) {
    Quiz quiz = quizzes.findById(id).orElseThrow();
    if (!quiz.owner.id.equals(owner.id)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN
    );
    return quiz;
  }

  private Quiz accessible(Long id, User user) {
    Quiz quiz = quizzes.findById(id).orElseThrow();
    if (
      !quiz.owner.id.equals(user.id) &&
      !("STUDENT".equals(user.role) && "TEACHER".equals(quiz.owner.role))
    ) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    return quiz;
  }

  private Question ownedQuestion(Long id, User teacher) {
    Question question = questions.findById(id).orElseThrow();
    if (!question.teacher.id.equals(teacher.id)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN
    );
    return question;
  }

  private void requireNoAttempts(Long quizId, String message) {
    if (results.existsByQuizId(quizId)) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      message
    );
  }

  private Map<String, Object> questionView(Question question) {
    return Map.of(
      "id",
      question.id,
      "content",
      question.content,
      "answers",
      answers
        .findByQuestionId(question.id)
        .stream()
        .map(answer -> Map.of("id", answer.id, "content", answer.content))
        .toList()
    );
  }

  private QuizAnswer answerSnapshot(
    QuizResult result,
    Question question,
    List<Answer> choices,
    Answer chosen
  ) {
    QuizAnswer answer = new QuizAnswer();
    answer.result = result;
    answer.question = question;
    answer.selected = chosen;
    answer.questionText = question.content;
    answer.explanation = question.explanation;
    answer.selectedText = chosen == null ? "Chưa trả lời" : chosen.content;
    answer.correct = chosen != null && chosen.correct;
    answer.correctText = choices
      .stream()
      .filter(choice -> choice.correct)
      .map(choice -> choice.content)
      .findFirst()
      .orElse("");
    return answer;
  }

  private Map<String, Object> resultAnswerView(QuizAnswer answer) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", answer.id);
    view.put("question", answer.questionText);
    view.put("selected", answer.selectedText);
    view.put("answer", answer.correctText);
    view.put("correct", answer.correct);
    view.put("explanation", answer.explanation);
    return view;
  }
}
