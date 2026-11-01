package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.Module;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseRepo;
import com.example.lms.repository.LessonRepo;
import com.example.lms.repository.ModuleRepo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Single place for "does this teacher own that content?" lookups. Every
 * content service reuses it instead of trusting an id coming from the client.
 */
@Service
@Transactional(readOnly = true)
public class ContentAccessService {

  private final CourseRepo courses;
  private final ModuleRepo modules;
  private final LessonRepo lessons;

  public ContentAccessService(
    CourseRepo courses,
    ModuleRepo modules,
    LessonRepo lessons
  ) {
    this.courses = courses;
    this.modules = modules;
    this.lessons = lessons;
  }

  public Course ownedCourse(Long id, User teacher) {
    Course c = courses
      .findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    if (!c.teacher.id.equals(teacher.id)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Bạn chỉ có thể quản lý khóa học của mình"
    );
    return c;
  }

  public Module ownedModule(Long id, User teacher) {
    Module m = modules
      .findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    ownedCourse(m.course.id, teacher);
    return m;
  }

  public Lesson ownedLesson(Long id, User teacher) {
    Lesson l = lessons
      .findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    ownedCourse(l.module.course.id, teacher);
    return l;
  }
}
