package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "quizzes")
public class Quiz {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String title;
  public String subject;
  public int durationMinutes = 20;

  @ManyToOne
  public User owner;
}
