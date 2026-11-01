package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(
  name = "wishlist_items",
  uniqueConstraints = @UniqueConstraint(columnNames = { "student_id", "course_id" })
)
public class WishlistItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne(optional = false)
  public User student;

  @ManyToOne(optional = false)
  public Course course;

  public java.time.Instant createdAt = java.time.Instant.now();
}
