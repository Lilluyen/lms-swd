package com.example.lms.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

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

  public BigDecimal originalAmount;
  public BigDecimal discountAmount = BigDecimal.ZERO;
  public String voucherCode;
  public BigDecimal amount;
  public String status = "PENDING";

  @Column(unique = true)
  public String paymentCode;

  @Column(unique = true)
  public String transactionReference;

  public Instant paymentDate;
  public Instant createdAt = Instant.now();
  public Instant expiresAt;
  public Instant cancelledAt;
  public BigDecimal paidAmount;

  @Column(length = 500)
  public String reconciliationNote;

  @Column(length = 2000)
  public String webhookPayload;
}
