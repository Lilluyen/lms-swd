package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "learning_materials")
public class LearningMaterial {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String title;

  @Column(length = 500)
  public String fileUrl;

  public String materialType;

  @ManyToOne
  public Lesson lesson;
}
