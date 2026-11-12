package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.CourseOrder;
import com.example.lms.entity.CourseReview;
import com.example.lms.entity.Enrollment;
import com.example.lms.entity.LearningProgress;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.Module;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseOrderRepository;
import com.example.lms.repository.CourseReviewRepository;
import com.example.lms.repository.EnrollmentRepository;
import com.example.lms.repository.LearningProgressRepository;
import com.example.lms.repository.LessonRepository;
import com.example.lms.repository.ModuleRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Enrollment business service (matches EnrollmentService in Class Diagram 4).
 * Computes learning progress, learning status (JUST_ENROLLED, IN_PROGRESS, COMPLETED),
 * resume lesson, payment badge, and manages course archiving.
 */
@Service
@Transactional
public class EnrollmentService {

  private final EnrollmentRepository enrollments;
  private final ModuleRepository modules;
  private final LessonRepository lessons;
  private final LearningProgressRepository progresses;
  private final CourseOrderRepository orders;
  private final CourseReviewRepository reviews;

  public EnrollmentService(
    EnrollmentRepository enrollments,
    ModuleRepository modules,
    LessonRepository lessons,
    LearningProgressRepository progresses,
    CourseOrderRepository orders,
    CourseReviewRepository reviews
  ) {
    this.enrollments = enrollments;
    this.modules = modules;
    this.lessons = lessons;
    this.progresses = progresses;
    this.orders = orders;
    this.reviews = reviews;
  }

  public List<Enrollment> listByStudent(User student) {
    List<Enrollment> list = enrollments.findByStudentId(student.id);
    Set<Long> completedLessonIds = new HashSet<>();
    for (LearningProgress p : progresses.findAll()) {
      if (
        p.enrollment != null &&
        p.enrollment.student != null &&
        p.enrollment.student.id.equals(student.id) &&
        p.completed &&
        p.lesson != null
      ) {
        completedLessonIds.add(p.lesson.id);
      }
    }
    List<CourseOrder> studentOrders = orders.findByStudentId(student.id);
    for (Enrollment e : list) {
      enrich(e, completedLessonIds, studentOrders);
    }
    return list;
  }

  public Enrollment toggleArchive(User student, Long courseId) {
    Enrollment enrollment = enrollments
      .findByStudentId(student.id)
      .stream()
      .filter(e -> e.course != null && e.course.id.equals(courseId))
      .findFirst()
      .orElseThrow(() ->
        new ResponseStatusException(
          HttpStatus.NOT_FOUND,
          "Chưa ghi danh khóa học này"
        )
      );
    enrollment.archived = !enrollment.archived;
    enrollments.save(enrollment);
    return listByStudent(student)
      .stream()
      .filter(e -> e.course.id.equals(courseId))
      .findFirst()
      .orElse(enrollment);
  }

  private void enrich(
    Enrollment e,
    Set<Long> completedLessonIds,
    List<CourseOrder> studentOrders
  ) {
    if (e.course == null) return;
    Course c = e.course;
    List<CourseReview> revList = reviews.findByCourseIdOrderByUpdatedAtDesc(
      c.id
    );
    c.reviewCount = revList.size();
    c.rating = revList.isEmpty()
      ? null
      : revList.stream().mapToInt(r -> r.rating).average().orElse(0);
    c.enrollmentCount = enrollments.countByCourseId(c.id);

    List<Lesson> courseLessons = new ArrayList<>();
    for (Module m : modules.findByCourseIdOrderByPosition(c.id)) {
      courseLessons.addAll(lessons.findByModuleIdOrderByPosition(m.id));
    }

    int total = courseLessons.size();
    int done = 0;
    Long firstId = courseLessons.isEmpty() ? null : courseLessons.get(0).id;
    Long resumeId = null;

    for (Lesson l : courseLessons) {
      if (completedLessonIds.contains(l.id)) {
        done++;
      } else if (resumeId == null) {
        resumeId = l.id;
      }
    }
    if (resumeId == null) {
      resumeId = firstId;
    }

    e.totalLessons = total;
    e.completedLessons = done;
    e.progressPercent = total == 0
      ? 0
      : Math.min(100, (int) Math.round((done * 100.0) / total));
    e.firstLessonId = firstId;
    e.resumeLessonId = resumeId;

    if (total > 0 && done >= total) {
      e.learningStatus = "COMPLETED";
    } else if (done > 0) {
      e.learningStatus = "IN_PROGRESS";
    } else {
      e.learningStatus = "JUST_ENROLLED";
    }

    if (e.status == null || e.status.isBlank()) {
      e.status = "ACTIVE";
    }

    CourseOrder paidOrder = studentOrders
      .stream()
      .filter(
        o ->
          o.course != null &&
          o.course.id.equals(c.id) &&
          "PAID".equals(o.status)
      )
      .findFirst()
      .orElse(null);

    if (paidOrder != null) {
      e.paymentBadge = "ĐÃ XÁC NHẬN THANH TOÁN";
      e.orderId = paidOrder.id;
    } else if (c.price != null && c.price.signum() > 0) {
      e.paymentBadge = "ĐÃ KÍCH HOẠT";
    } else {
      e.paymentBadge = "GHI DANH MIỄN PHÍ";
    }
  }
}
