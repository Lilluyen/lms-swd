package com.example.lms.repository;

import com.example.lms.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepo extends JpaRepository<Enrollment, Long> {
  boolean existsByStudentIdAndCourseId(Long studentId, Long courseId);
  java.util.List<Enrollment> findByStudentId(Long studentId);
  long countByCourseId(Long courseId);
  java.util.List<Enrollment> findByCourseId(Long courseId);
}
