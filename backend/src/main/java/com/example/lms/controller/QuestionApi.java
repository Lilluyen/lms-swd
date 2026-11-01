package com.example.lms.controller;

import com.example.lms.dto.Generate;
import com.example.lms.dto.QuestionInput;
import com.example.lms.entity.User;
import com.example.lms.repository.AnswerRepo;
import com.example.lms.repository.CourseRepo;
import com.example.lms.repository.CourseReviewRepo;
import com.example.lms.repository.EnrollmentRepo;
import com.example.lms.repository.QuestionRepo;
import com.example.lms.repository.WishlistRepo;
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
public class QuestionApi extends BaseController {

  private final QuestionService questionService;

  public QuestionApi(
    CourseRepo courses,
    QuestionRepo questions,
    AnswerRepo answers,
    EnrollmentRepo enrollments,
    CourseReviewRepo courseReviews,
    WishlistRepo wishlists,
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
    @RequestBody QuestionInput input,
    HttpSession session
  ) {
    return questionService.create(teacher(session), input);
  }

  @PostMapping("/questions/bulk")
  List<Map<String, Object>> addQuestions(
    @RequestBody List<QuestionInput> inputs,
    HttpSession session
  ) {
    return questionService.createAll(teacher(session), inputs);
  }

  @PutMapping("/questions/{id}")
  Map<String, Object> editQuestion(
    @PathVariable Long id,
    @RequestBody QuestionInput input,
    HttpSession session
  ) {
    return questionService.update(id, teacher(session), input);
  }

  @DeleteMapping("/questions/{id}")
  void deleteQuestion(@PathVariable Long id, HttpSession session) {
    questionService.delete(id, teacher(session));
  }

  @PostMapping("/questions/generate")
  Object generate(@RequestBody Generate input, HttpSession session) {
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
