package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "quiz_attempt_answers")
public class QuizAnswer {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne
  public QuizResult result;

  @ManyToOne
  public Question question;

  @ManyToOne
  public Answer selected;

  @Column(length = 3000)
  public String questionText;

  @Column(length = 3000)
  public String explanation;

  public String selectedText;
  public String correctText;
  public boolean correct;
}
