package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "quiz_attempts")
public class QuizResult {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne
  public Quiz quiz;

  @ManyToOne
  public User student;

  public int score;
  public int total;
  @Column(length = 12000)
  public String aiFeedback;
  public java.time.Instant startedAt = java.time.Instant.now();
  public java.time.Instant completedAt;
}
