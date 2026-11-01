package com.example.lms.entity;

import jakarta.persistence.*;
import java.time.Instant;

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

  public Instant enrolledAt = Instant.now();

  public String status = "ACTIVE";

  public boolean archived = false;

  @Transient
  public int totalLessons;

  @Transient
  public int completedLessons;

  @Transient
  public int progressPercent;

  @Transient
  public String learningStatus;

  @Transient
  public Long firstLessonId;

  @Transient
  public Long resumeLessonId;

  @Transient
  public String paymentBadge;

  @Transient
  public Long orderId;
}
