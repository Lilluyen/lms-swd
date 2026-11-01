package com.example.lms.repository;

import com.example.lms.entity.QuizResult;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizResultRepo extends JpaRepository<QuizResult, Long> {
  boolean existsByQuizId(Long quizId);

  java.util.List<QuizResult> findByStudentIdOrderByCompletedAtDesc(
    Long studentId
  );
}
