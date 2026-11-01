package com.example.lms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "lessons")
public class Lesson {

  public static final String TEXT = "TEXT";
  public static final String VIDEO = "VIDEO";
  public static final String FILE = "FILE";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String title;

  /** TEXT, VIDEO or FILE. */
  public String contentType = TEXT;

  @Column(length = 10000)
  public String content;

  public String videoUrl;

  /** Optional length of the lesson, in minutes (1–600). */
  public Integer durationMinutes;

  /** Stored attachment for FILE lessons. */
  public String fileUrl;
  public String fileName;

  public int position;

  @ManyToOne
  public Module module;
}
