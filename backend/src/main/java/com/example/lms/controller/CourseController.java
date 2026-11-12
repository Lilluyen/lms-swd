package com.example.lms.controller;

import com.example.lms.entity.*;
import com.example.lms.entity.Module;
import com.example.lms.repository.*;
import com.example.lms.service.CourseService;
import com.example.lms.service.CurrentUserService;
import com.example.lms.service.SupportService;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Course management feature: public catalogue, teacher course CRUD,
 * module/lesson structure and course reviews.
 */
@Transactional
@RestController
@RequestMapping("/api")
public class CourseController extends BaseController {

  private final ModuleRepository modules;
  private final LessonRepository lessons;

  @Autowired
  private SupportService support;

  public CourseController(
    CourseRepository courses,
    QuestionRepository questions,
    AnswerRepository answers,
    EnrollmentRepository enrollments,
    CourseReviewRepository courseReviews,
    WishlistRepository wishlists,
    CourseService courseService,
    CurrentUserService currentUser,
    ModuleRepository modules,
    LessonRepository lessons
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
    this.modules = modules;
    this.lessons = lessons;
  }

  /* --------------------------------------------------------------- catalogue */

  @GetMapping("/courses")
  List<Course> catalog() {
    return courses.findByPublishedTrue().stream().map(this::withStats).toList();
  }

  @GetMapping("/courses/mine")
  List<Course> myCourses(HttpSession s) {
    return courses
      .findByTeacherId(teacher(s).id)
      .stream()
      .map(this::withStats)
      .toList();
  }

  @PostMapping("/courses")
  Course createCourse(@RequestBody Course x, HttpSession s) {
    x.id = null;
    x.teacher = teacher(s);
    support.validateCourse(x);
    x.categoryDefinition = support.category(x.category);
    return courses.save(x);
  }

  @PutMapping("/courses/{id}")
  Course updateCourse(
    @PathVariable Long id,
    @RequestBody Course x,
    HttpSession s
  ) {
    Course c = owned(id, teacher(s));
    support.validateCourse(x);
    c.categoryDefinition = support.category(x.category);
    c.level = x.level;
    c.title = x.title;
    c.description = x.description;
    c.category = x.category;
    c.price = x.price;
    c.cover = x.cover;
    c.published = x.published;
    return courses.save(c);
  }

  @DeleteMapping("/courses/{id}")
  void deleteCourse(@PathVariable Long id, HttpSession s) {
    Course c = owned(id, teacher(s));
    c.published = false;
    courses.save(c);
  }

  @GetMapping("/courses/{id}")
  Map<String, Object> course(@PathVariable Long id, HttpSession s) {
    Course c = courses
      .findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    Long uid = (Long) s.getAttribute("uid");
    boolean access =
      uid != null &&
      (c.teacher.id.equals(uid) ||
        enrollments.existsByStudentIdAndCourseId(uid, id));
    if (
      !c.published && !c.teacher.id.equals(uid)
    ) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    List<Map<String, Object>> content = new ArrayList<>();
    for (Module m : modules.findByCourseIdOrderByPosition(id)) content.add(
      Map.of(
        "module",
        m,
        "lessons",
        access
          ? lessons.findByModuleIdOrderByPosition(m.id)
          : lessons
              .findByModuleIdOrderByPosition(m.id)
              .stream()
              .map(l -> {
                Lesson preview = new Lesson();
                preview.id = l.id;
                preview.title = l.title;
                preview.position = l.position;
                preview.contentType = l.contentType;
                preview.durationMinutes = l.durationMinutes;
                return preview;
              })
              .toList()
      )
    );
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("course", withStats(c));
    response.put("content", content);
    response.put("access", access);
    response.put(
      "reviews",
      courseReviews
        .findByCourseIdOrderByUpdatedAtDesc(id)
        .stream()
        .map(this::reviewView)
        .toList()
    );
    response.put(
      "wishlisted",
      uid != null && wishlists.findByStudentIdAndCourseId(uid, id).isPresent()
    );
    return response;
  }

  /* ----------------------------------------------------------------- modules */

  @PostMapping("/courses/{id}/modules")
  Module addModule(
    @PathVariable Long id,
    @RequestBody Module x,
    HttpSession s
  ) {
    x.id = null;
    x.title = support.text(x.title, 3, 100, "Tên module");
    x.course = owned(id, teacher(s));
    return modules.save(x);
  }

  @PutMapping("/modules/{id}")
  Module updateModule(
    @PathVariable Long id,
    @RequestBody Module x,
    HttpSession s
  ) {
    Module m = modules.findById(id).orElseThrow();
    owned(m.course.id, teacher(s));
    m.title = support.text(x.title, 3, 100, "Tên module");
    m.position = x.position;
    return modules.save(m);
  }

  @DeleteMapping("/modules/{id}")
  void deleteModule(@PathVariable Long id, HttpSession s) {
    Module m = modules.findById(id).orElseThrow();
    owned(m.course.id, teacher(s));
    if (
      !lessons.findByModuleIdOrderByPosition(id).isEmpty()
    ) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Remove lessons first"
    );
    modules.delete(m);
  }

  /* ----------------------------------------------------------------- lessons */

  @PostMapping("/modules/{id}/lessons")
  Lesson addLesson(
    @PathVariable Long id,
    @RequestBody Lesson x,
    HttpSession s
  ) {
    Module m = modules.findById(id).orElseThrow();
    owned(m.course.id, teacher(s));
    support.validateLesson(x);
    x.id = null;
    x.module = m;
    return lessons.save(x);
  }

  @PutMapping("/lessons/{id}")
  Lesson updateLesson(
    @PathVariable Long id,
    @RequestBody Lesson x,
    HttpSession s
  ) {
    Lesson l = lessons.findById(id).orElseThrow();
    owned(l.module.course.id, teacher(s));
    support.validateLesson(x);
    l.title = x.title;
    l.content = x.content;
    l.videoUrl = x.videoUrl;
    l.position = x.position;
    return lessons.save(l);
  }

  @DeleteMapping("/lessons/{id}")
  void deleteLesson(@PathVariable Long id, HttpSession s) {
    Lesson l = lessons.findById(id).orElseThrow();
    owned(l.module.course.id, teacher(s));
    lessons.delete(l);
  }

  /* ----------------------------------------------------------------- reviews */

  record CourseReviewRequest(Integer rating, String comment) {}

  @PostMapping("/courses/{courseId}/reviews")
  Map<String, Object> review(
    @PathVariable Long courseId,
    @RequestBody CourseReviewRequest input,
    HttpSession s
  ) {
    User user = student(s);
    if (
      !enrollments.existsByStudentIdAndCourseId(user.id, courseId)
    ) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Chỉ học viên đã ghi danh mới có thể đánh giá khóa học"
    );
    if (
      input.rating() == null || input.rating() < 1 || input.rating() > 5
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Đánh giá phải từ 1 đến 5 sao"
    );
    String comment = input.comment() == null ? "" : input.comment().trim();
    if (comment.length() > 1000) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Nhận xét tối đa 1.000 ký tự"
    );
    CourseReview review = courseReviews
      .findByStudentIdAndCourseId(user.id, courseId)
      .orElseGet(() -> {
        CourseReview created = new CourseReview();
        created.student = user;
        created.course = courses.findById(courseId).orElseThrow();
        return created;
      });
    review.rating = input.rating();
    review.comment = comment;
    review.updatedAt = Instant.now();
    return reviewView(courseReviews.save(review));
  }
}
