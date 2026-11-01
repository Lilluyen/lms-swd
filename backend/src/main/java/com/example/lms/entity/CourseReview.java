package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(
  name = "course_reviews",
  uniqueConstraints = @UniqueConstraint(columnNames = { "student_id", "course_id" })
)
public class CourseReview {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne(optional = false)
  public User student;

  @ManyToOne(optional = false)
  public Course course;

  public int rating;

  @Column(length = 1000)
  public String comment;

  public java.time.Instant createdAt = java.time.Instant.now();
  public java.time.Instant updatedAt = java.time.Instant.now();
}
