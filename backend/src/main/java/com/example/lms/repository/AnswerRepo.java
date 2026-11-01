package com.example.lms.repository;

import com.example.lms.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnswerRepo extends JpaRepository<Answer, Long> {
  java.util.List<Answer> findByQuestionId(Long questionId);
}
