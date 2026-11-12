package com.example.lms.controller;

import com.example.lms.dto.AnswerRequest;
import com.example.lms.entity.Course;
import com.example.lms.entity.CourseReview;
import com.example.lms.entity.Question;
import com.example.lms.entity.User;
import com.example.lms.repository.AnswerRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.CourseReviewRepository;
import com.example.lms.repository.EnrollmentRepository;
import com.example.lms.repository.QuestionRepository;
import com.example.lms.repository.WishlistRepository;
import com.example.lms.service.CourseService;
import com.example.lms.service.CurrentUserService;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Shared controller helpers (the "BaseController" of the class diagrams).
 *
 * Feature controllers ({@link CourseController}, {@link QuestionController}, {@link QuizController},
 * {@link LearningController}) keep their own endpoints and dependencies; only the
 * cross-cutting session/ownership lookups live here so a rule such as "only the
 * course owner may change it" is implemented once.
 */
@Transactional
public abstract class BaseController {

  protected final CourseRepository courses;
  protected final QuestionRepository questions;
  protected final AnswerRepository answers;
  protected final EnrollmentRepository enrollments;
  protected final CourseReviewRepository courseReviews;
  protected final WishlistRepository wishlists;
  protected final CourseService courseService;
  protected final CurrentUserService currentUser;

  protected BaseController(
    CourseRepository courses,
    QuestionRepository questions,
    AnswerRepository answers,
    EnrollmentRepository enrollments,
    CourseReviewRepository courseReviews,
    WishlistRepository wishlists,
    CourseService courseService,
    CurrentUserService currentUser
  ) {
    this.courses = courses;
    this.questions = questions;
    this.answers = answers;
    this.enrollments = enrollments;
    this.courseReviews = courseReviews;
    this.wishlists = wishlists;
    this.courseService = courseService;
    this.currentUser = currentUser;
  }

  protected User me(HttpSession session) {
    return currentUser.require(session);
  }

  protected User student(HttpSession session) {
    return currentUser.requireStudent(session);
  }

  protected User teacher(HttpSession session) {
    return currentUser.requireTeacher(session);
  }

  protected Course owned(Long id, User teacher) {
    return courseService.owned(id, teacher);
  }

  protected Question ownedQuestion(Long id, User teacher) {
    Question q = questions
      .findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    if (!q.teacher.id.equals(teacher.id)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN
    );
    return q;
  }

  protected Course withStats(Course course) {
    List<CourseReview> list = courseReviews.findByCourseIdOrderByUpdatedAtDesc(
      course.id
    );
    course.reviewCount = list.size();
    course.rating = list.isEmpty()
      ? null
      : list.stream().mapToInt(review -> review.rating).average().orElse(0);
    course.enrollmentCount = enrollments.countByCourseId(course.id);
    return course;
  }

  protected Map<String, Object> reviewView(CourseReview review) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", review.id);
    view.put("rating", review.rating);
    view.put("comment", review.comment == null ? "" : review.comment);
    view.put("createdAt", review.createdAt);
    view.put("updatedAt", review.updatedAt);
    view.put(
      "student",
      Map.of("id", review.student.id, "name", review.student.name)
    );
    return view;
  }

  protected Map<String, Object> questionView(Question question) {
    return Map.of(
      "question",
      question,
      "answers",
      answers.findByQuestionId(question.id)
    );
  }

  protected void saveAnswers(Question question, List<AnswerRequest> inputs) {
    if (
      inputs == null ||
      inputs.size() < 2 ||
      inputs.stream().filter(AnswerRequest::correct).count() != 1
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Exactly one correct answer is required"
    );
    for (var answer : answers.findByQuestionId(question.id)) answers.delete(
      answer
    );
    for (AnswerRequest input : inputs) {
      var answer = new com.example.lms.entity.Answer();
      answer.question = question;
      answer.content = input.content();
      answer.correct = input.correct();
      answers.save(answer);
    }
  }
}
