package com.example.lms.repository;

import com.example.lms.entity.QuizAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAnswerRepo extends JpaRepository<QuizAnswer, Long> {
  java.util.List<QuizAnswer> findByResultId(Long resultId);
}
