package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(
  name = "enrollments",
  uniqueConstraints = @UniqueConstraint(
    columnNames = { "student_id", "course_id" }
  )
)
public class Enrollment {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne
  public User student;

  @ManyToOne
  public Course course;

  public java.time.Instant enrolledAt = java.time.Instant.now();
}
