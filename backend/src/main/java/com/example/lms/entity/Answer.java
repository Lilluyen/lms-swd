package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "answers")
public class Answer {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String content;
  public boolean correct;

  @ManyToOne
  public Question question;
}
