package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "question_banks")
public class QuestionBank {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String title;
  public String subject;
  public String description;

  @ManyToOne
  public User teacher;
}
