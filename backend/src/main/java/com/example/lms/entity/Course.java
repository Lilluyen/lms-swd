package com.example.lms.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "courses")
public class Course {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String title;

  @Column(length = 5000)
  public String description;

  public String category;

  @ManyToOne
  public CourseCategory categoryDefinition;

  /** Extra context (audience, tools, scope) reused by the AI content dialog. */
  @Column(length = 2000)
  public String context;

  public String level = "BEGINNER";
  public java.math.BigDecimal price = java.math.BigDecimal.ZERO;
  public String cover;
  public boolean published = false;

  @Column(name = "updated_at")
  public Instant updatedAt = Instant.now();

  @ManyToOne
  public User teacher;

  /** Read models populated by the API; no fabricated rating is persisted. */
  @Transient
  public Double rating;

  @Transient
  public long reviewCount;

  @Transient
  public long enrollmentCount;

  @PrePersist
  @PreUpdate
  void touch() {
    updatedAt = Instant.now();
  }

  /** Status exposed to the UI: a course is either a draft or published. */
  @Transient
  public String getStatus() {
    return published ? "PUBLISHED" : "DRAFT";
  }
}
