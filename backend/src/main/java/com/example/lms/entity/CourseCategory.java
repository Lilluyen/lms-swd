package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "course_categories")
public class CourseCategory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(unique = true, nullable = false)
  public String name;

  public String description;
  public boolean active = true;
}
