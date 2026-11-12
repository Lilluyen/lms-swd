package com.example.lms.repository;

import com.example.lms.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
  java.util.List<QuizQuestion> findByQuizIdOrderByPosition(Long quizId);
  boolean existsByQuestionId(Long questionId);
}
