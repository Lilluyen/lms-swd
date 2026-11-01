package com.example.lms.repository;

import com.example.lms.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CourseRepo
  extends JpaRepository<Course, Long>, JpaSpecificationExecutor<Course> {
  java.util.List<Course> findByPublishedTrue();
  java.util.List<Course> findByTeacherId(Long teacherId);
}
