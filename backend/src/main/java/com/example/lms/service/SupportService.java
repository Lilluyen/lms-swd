package com.example.lms.service;

import com.example.lms.dto.*;
import com.example.lms.entity.*;
import com.example.lms.repository.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SupportService {

  @Autowired
  RoleRepo roles;

  @Autowired
  CourseCategoryRepo categories;

  @Autowired
  QuestionBankRepo banks;

  @Autowired
  LearningProgressRepo progresses;

  @Autowired
  EnrollmentRepo enrollments;

  @Autowired
  LessonRepo lessons;

  public String text(String s, int min, int max, String label) {
    if (
      s == null || s.trim().length() < min || s.trim().length() > max
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      label + " cần từ " + min + " đến " + max + " ký tự"
    );
    return s.trim();
  }

  public Role role(String name) {
    return roles
      .findAll()
      .stream()
      .filter(r -> r.name.equals(name))
      .findFirst()
      .orElseGet(() -> {
        Role r = new Role();
        r.name = name;
        return roles.save(r);
      });
  }

  public CourseCategory category(String name) {
    if (name == null || name.isBlank()) return null;
    return categories
      .findAll()
      .stream()
      .filter(c -> c.name.equals(name))
      .findFirst()
      .orElseGet(() -> {
        CourseCategory c = new CourseCategory();
        c.name = name;
        return categories.save(c);
      });
  }

  public QuestionBank bank(User user, String subject) {
    return banks
      .findAll()
      .stream()
      .filter(b -> b.teacher.id.equals(user.id) && b.subject.equals(subject))
      .findFirst()
      .orElseGet(() -> {
        QuestionBank b = new QuestionBank();
        b.teacher = user;
        b.subject = subject;
        b.title = subject;
        return banks.save(b);
      });
  }

  public Object banks(User user) {
    return banks
      .findAll()
      .stream()
      .filter(b -> b.teacher.id.equals(user.id))
      .toList();
  }

  public void validateCourse(Course c) {
    c.title = text(c.title, 5, 100, "Tên khóa học");
    c.description = text(c.description, 10, 2000, "Mô tả");
    if (
      c.price == null ||
      c.price.signum() < 0 ||
      c.price.compareTo(new java.math.BigDecimal("100000000")) > 0
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Giá phải từ 0 đến 100 triệu"
    );
  }

  public void validateLesson(Lesson l) {
    l.title = text(l.title, 3, 150, "Tên bài học");
    if (
      l.videoUrl != null &&
      !l.videoUrl.isBlank() &&
      !l.videoUrl.matches("https?://[^ ]+")
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Video URL không hợp lệ"
    );
    if (l.videoUrl == null || l.videoUrl.isBlank()) l.content = text(
      l.content,
      10,
      10000,
      "Nội dung"
    );
  }

  public void validateQuestion(QuestionInput x) {
    text(x.subject(), 1, 100, "Môn học");
    text(x.content(), 5, 3000, "Câu hỏi");
    if (
      !List.of("EASY", "MEDIUM", "HARD").contains(
        x.difficulty() == null ? "" : x.difficulty()
      )
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Độ khó không hợp lệ"
    );
    if (
      x.answers() == null ||
      x.answers().size() < 2 ||
      x.answers().size() > 6 ||
      x.answers().stream().filter(AnswerInput::correct).count() != 1
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Cần 2–6 đáp án và đúng một đáp án đúng"
    );
    for (AnswerInput a : x.answers()) text(a.content(), 1, 255, "Đáp án");
  }

  public Object progress(User u) {
    return progresses
      .findAll()
      .stream()
      .filter(p -> p.enrollment.student.id.equals(u.id))
      .map(p ->
        Map.of(
          "lessonId",
          p.lesson.id,
          "courseId",
          p.enrollment.course.id,
          "completed",
          p.completed
        )
      )
      .toList();
  }

  public Object complete(User u, Long id) {
    Lesson l = lessons.findById(id).orElseThrow();
    Enrollment e = enrollments
      .findByStudentId(u.id)
      .stream()
      .filter(v -> v.course.id.equals(l.module.course.id))
      .findFirst()
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    LearningProgress p = progresses
      .findAll()
      .stream()
      .filter(v -> v.enrollment.id.equals(e.id) && v.lesson.id.equals(id))
      .findFirst()
      .orElseGet(LearningProgress::new);
    p.enrollment = e;
    p.lesson = l;
    progresses.save(p);
    return Map.of("completed", true);
  }
}
