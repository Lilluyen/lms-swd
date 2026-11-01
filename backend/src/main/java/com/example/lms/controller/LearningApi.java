package com.example.lms.controller;

import com.example.lms.entity.*;
import com.example.lms.repository.*;
import com.example.lms.service.*;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Learning feature: the student's enrollments, wishlist, lesson progress and
 * lesson completion.
 */
@Transactional
@RestController
@RequestMapping("/api")
public class LearningApi extends BaseController {

  @Autowired
  private SupportService support;

  public LearningApi(
    CourseRepo courses,
    QuestionRepo questions,
    AnswerRepo answers,
    EnrollmentRepo enrollments,
    CourseReviewRepo courseReviews,
    WishlistRepo wishlists,
    CourseService courseService,
    CurrentUserService currentUser
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
  }

  @GetMapping("/enrollments")
  List<Enrollment> myEnrollments(HttpSession s) {
    return enrollments.findByStudentId(student(s).id);
  }

  @GetMapping("/progress")
  Object progress(HttpSession s) {
    return support.progress(student(s));
  }

  @PostMapping("/lessons/{id}/complete")
  Object complete(@PathVariable Long id, HttpSession s) {
    return support.complete(student(s), id);
  }

  @GetMapping("/wishlist")
  List<WishlistItem> wishlist(HttpSession s) {
    return wishlists.findByStudentIdOrderByCreatedAtDesc(student(s).id);
  }

  @PostMapping("/wishlist/{courseId}")
  Map<String, Object> addWishlist(@PathVariable Long courseId, HttpSession s) {
    User user = student(s);
    Course course = courses.findById(courseId).orElseThrow();
    if (!course.published) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND
    );
    if (wishlists.findByStudentIdAndCourseId(user.id, courseId).isEmpty()) {
      WishlistItem item = new WishlistItem();
      item.student = user;
      item.course = course;
      wishlists.save(item);
    }
    return Map.of("wishlisted", true);
  }

  @DeleteMapping("/wishlist/{courseId}")
  Map<String, Object> removeWishlist(
    @PathVariable Long courseId,
    HttpSession s
  ) {
    User user = student(s);
    wishlists
      .findByStudentIdAndCourseId(user.id, courseId)
      .ifPresent(wishlists::delete);
    return Map.of("wishlisted", false);
  }
}
