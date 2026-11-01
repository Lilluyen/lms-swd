package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "payment_transactions")
public class CourseOrder {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @ManyToOne
  public User student;

  @ManyToOne
  public Course course;

  public java.math.BigDecimal amount;
  public String status = "PENDING";

  @Column(unique = true)
  public String paymentCode;

  @Column(unique = true)
  public String transactionReference;

  public java.time.Instant paymentDate;
  public java.time.Instant createdAt = java.time.Instant.now();
  public java.time.Instant expiresAt;
  public java.time.Instant cancelledAt;
  public java.math.BigDecimal paidAmount;
  @Column(length = 500)
  public String reconciliationNote;
}
