package com.example.lms.repository;

import com.example.lms.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepo extends JpaRepository<Question, Long> {
  java.util.List<Question> findByTeacherId(Long teacherId);
}
