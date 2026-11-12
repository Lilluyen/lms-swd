package com.example.lms.controller;

import com.example.lms.dto.QuestionGenerationRequest;
import com.example.lms.dto.QuestionRequest;
import com.example.lms.entity.User;
import com.example.lms.repository.AnswerRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.CourseReviewRepository;
import com.example.lms.repository.EnrollmentRepository;
import com.example.lms.repository.QuestionRepository;
import com.example.lms.repository.WishlistRepository;
import com.example.lms.service.CourseService;
import com.example.lms.service.CurrentUserService;
import com.example.lms.service.QuestionService;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

/** Question-bank HTTP boundary backed by {@link QuestionService}. */
@RestController
@RequestMapping("/api")
public class QuestionController extends BaseController {

  private final QuestionService questionService;

  public QuestionController(
    CourseRepository courses,
    QuestionRepository questions,
    AnswerRepository answers,
    EnrollmentRepository enrollments,
    CourseReviewRepository courseReviews,
    WishlistRepository wishlists,
    CourseService courseService,
    CurrentUserService currentUser,
    QuestionService questionService
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
    this.questionService = questionService;
  }

  @GetMapping("/questions")
  List<Map<String, Object>> myQuestions(HttpSession session) {
    return questionService.list(teacher(session));
  }

  @PostMapping("/questions")
  Map<String, Object> addQuestion(
    @RequestBody QuestionRequest input,
    HttpSession session
  ) {
    return questionService.create(teacher(session), input);
  }

  @PostMapping("/questions/bulk")
  List<Map<String, Object>> addQuestions(
    @RequestBody List<QuestionRequest> inputs,
    HttpSession session
  ) {
    return questionService.createAll(teacher(session), inputs);
  }

  @PutMapping("/questions/{id}")
  Map<String, Object> editQuestion(
    @PathVariable Long id,
    @RequestBody QuestionRequest input,
    HttpSession session
  ) {
    return questionService.update(id, teacher(session), input);
  }

  @DeleteMapping("/questions/{id}")
  void deleteQuestion(@PathVariable Long id, HttpSession session) {
    questionService.delete(id, teacher(session));
  }

  @PostMapping("/questions/generate")
  Object generate(@RequestBody QuestionGenerationRequest input, HttpSession session) {
    return questionService.generate(input, teacher(session));
  }

  @GetMapping("/banks")
  Object banks(HttpSession session) {
    return questionService.banks(teacher(session));
  }

  @PostMapping("/content/generate")
  Object content(
    @RequestBody Map<String, String> input,
    HttpSession session
  ) {
    User teacher = teacher(session);
    return questionService.generateContent(
      input.get("topic"),
      input.getOrDefault("kind", "lesson"),
      teacher
    );
  }
}
