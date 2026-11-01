package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "questions")
public class Question {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String subject;

  @ManyToOne
  public QuestionBank bank;

  public String questionType = "MULTIPLE_CHOICE";
  public boolean aiGenerated = false;

  @Column(length = 3000)
  public String content;

  public String difficulty;

  @Column(length = 3000)
  public String explanation;

  @ManyToOne
  public User teacher;
}
