package com.example.lms.repository;

import com.example.lms.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizRepository extends JpaRepository<Quiz, Long> {
  java.util.List<Quiz> findByOwnerId(Long ownerId);
  java.util.List<Quiz> findByOwnerRole(String role);
}
