package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(
  name = "learning_progress",
  uniqueConstraints = @UniqueConstraint(
    columnNames = { "enrollment_id", "lesson_id" }
  )
)
public class LearningProgress {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne
  public Enrollment enrollment;

  @ManyToOne
  public Lesson lesson;

  public boolean completed = true;
  public java.time.Instant completedAt = java.time.Instant.now();
}
