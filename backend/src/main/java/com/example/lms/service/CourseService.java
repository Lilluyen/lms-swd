package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseRepo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CourseService {

  private final CourseRepo courses;

  public CourseService(CourseRepo courses) {
    this.courses = courses;
  }

  public Course owned(Long id, User teacher) {
    Course course = courses
      .findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    if (
      !course.teacher.id.equals(teacher.id)
    ) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    return course;
  }
}
