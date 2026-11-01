package com.example.lms.repository;

import com.example.lms.entity.CourseReview;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseReviewRepo extends JpaRepository<CourseReview, Long> {
  Optional<CourseReview> findByStudentIdAndCourseId(Long studentId, Long courseId);
  List<CourseReview> findByCourseIdOrderByUpdatedAtDesc(Long courseId);
  long countByCourseId(Long courseId);
  void deleteByCourseId(Long courseId);
}
