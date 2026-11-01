package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "modules")
public class Module {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String title;

  @Column(length = 500)
  public String description;

  public int position;

  @ManyToOne
  public Course course;
}
