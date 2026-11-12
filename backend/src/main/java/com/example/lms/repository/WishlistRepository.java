package com.example.lms.repository;

import com.example.lms.entity.WishlistItem;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {
  Optional<WishlistItem> findByStudentIdAndCourseId(Long studentId, Long courseId);
  List<WishlistItem> findByStudentIdOrderByCreatedAtDesc(Long studentId);
  void deleteByCourseId(Long courseId);
}
