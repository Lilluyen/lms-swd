package com.example.lms.controller;

import com.example.lms.dto.Generate;
import com.example.lms.dto.QuizInput;
import com.example.lms.dto.Submission;
import com.example.lms.entity.Quiz;
import com.example.lms.entity.QuizResult;
import com.example.lms.entity.User;
import com.example.lms.repository.AnswerRepo;
import com.example.lms.repository.CourseRepo;
import com.example.lms.repository.CourseReviewRepo;
import com.example.lms.repository.EnrollmentRepo;
import com.example.lms.repository.QuestionRepo;
import com.example.lms.repository.WishlistRepo;
import com.example.lms.service.CourseService;
import com.example.lms.service.CurrentUserService;
import com.example.lms.service.QuizService;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** Quiz HTTP boundary. Business rules and persistence live in {@link QuizService}. */
@RestController
@RequestMapping("/api")
public class QuizApi extends BaseController {

  private final QuizService quizService;

  public QuizApi(
    CourseRepo courses,
    QuestionRepo questions,
    AnswerRepo answers,
    EnrollmentRepo enrollments,
    CourseReviewRepo courseReviews,
    WishlistRepo wishlists,
    CourseService courseService,
    CurrentUserService currentUser,
    QuizService quizService
  ) {
    super(
      courses,
      questions,
      answers,
      enrollments,
      courseReviews,
      wishlists,
      courseService,
      currentUser
    );
    this.quizService = quizService;
  }

  @PostMapping("/quizzes")
  Quiz addQuiz(@RequestBody QuizInput input, HttpSession session) {
    return quizService.create(input, teacher(session));
  }

  @PutMapping("/quizzes/{id}")
  Quiz updateQuiz(
    @PathVariable Long id,
    @RequestBody QuizInput input,
    HttpSession session
  ) {
    return quizService.update(id, input, teacher(session));
  }

  @DeleteMapping("/quizzes/{id}")
  void deleteQuiz(@PathVariable Long id, HttpSession session) {
    quizService.delete(id, teacher(session));
  }

  @PostMapping("/quizzes/generate")
  Quiz generatePractice(@RequestBody Generate input, HttpSession session) {
    return quizService.generatePractice(input, student(session));
  }

  @GetMapping("/quizzes")
  List<Quiz> myQuizzes(HttpSession session) {
    return quizService.listVisible(me(session));
  }

  @GetMapping("/quizzes/{id}")
  Map<String, Object> quiz(@PathVariable Long id, HttpSession session) {
    return quizService.detail(id, me(session));
  }

  @PostMapping("/quizzes/{id}/start")
  Map<String, Object> start(@PathVariable Long id, HttpSession session) {
    synchronized (session) {
    User student = student(session);
    Map<String, Object> response = quizService.start(id, student);
    session.setAttribute("quiz-start-" + id, Instant.now());
    session.setAttribute("quiz-checked-" + id, new java.util.HashMap<Long, Long>());
    return response;
    }
  }

  public record CheckInput(Long questionId, Long answerId) {}

  @PostMapping("/quizzes/{id}/check")
  Map<String, Object> check(@PathVariable Long id, @RequestBody CheckInput input, HttpSession session) {
    synchronized (session) {
      User student = student(session);
      Object value = session.getAttribute("quiz-start-" + id);
      Instant startedAt = value instanceof Instant instant ? instant : null;
      Map<Long, Long> checked = checkedChoices(session, id);
      Long previous = checked.get(input.questionId());
      if (previous != null && !previous.equals(input.answerId()))
        throw new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.CONFLICT, "Câu trả lời đã được chốt");
      Map<String, Object> feedback = quizService.checkAnswer(id, input.questionId(), input.answerId(), student, startedAt);
      checked.put(input.questionId(), input.answerId());
      session.setAttribute("quiz-checked-" + id, checked);
      return feedback;
    }
  }

  @SuppressWarnings("unchecked")
  private Map<Long, Long> checkedChoices(HttpSession session, Long id) {
    Object value = session.getAttribute("quiz-checked-" + id);
    return value instanceof Map<?, ?> ? (Map<Long, Long>) value : new java.util.HashMap<>();
  }

  @PostMapping("/quizzes/{id}/submit")
  QuizResult submit(
    @PathVariable Long id,
    @RequestBody Submission input,
    HttpSession session
  ) {
    synchronized (session) {
    User student = student(session);
    Object value = session.getAttribute("quiz-start-" + id);
    Instant startedAt = value instanceof Instant instant ? instant : null;
    QuizResult result = quizService.submit(id, new Submission(new java.util.HashMap<>(checkedChoices(session, id))), student, startedAt);
    session.removeAttribute("quiz-start-" + id);
    session.removeAttribute("quiz-checked-" + id);
    return result;
    }
  }

  @GetMapping("/results")
  List<QuizResult> myResults(HttpSession session) {
    return quizService.results(student(session));
  }

  @GetMapping("/results/{id}")
  Map<String, Object> resultDetail(
    @PathVariable Long id,
    HttpSession session
  ) {
    return quizService.result(id, student(session));
  }
}
