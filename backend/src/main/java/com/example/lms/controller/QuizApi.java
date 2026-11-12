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

    return response;
    }
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
    QuizResult result = quizService.submit(id, input, student, startedAt);
    session.removeAttribute("quiz-start-" + id);

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
