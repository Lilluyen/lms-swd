package com.example.lms.repository;

import com.example.lms.entity.CourseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseOrderRepo extends JpaRepository<CourseOrder, Long> {
  java.util.Optional<CourseOrder> findByPaymentCode(String paymentCode);
  java.util.List<CourseOrder> findByStudentId(Long studentId);
  java.util.List<CourseOrder> findByCourseId(Long courseId);
  java.util.List<CourseOrder> findByStudentIdAndCourseIdOrderByCreatedAtDesc(Long studentId, Long courseId);
  long countByCourseIdAndStatus(Long courseId, String status);
}
