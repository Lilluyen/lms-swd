package com.example.lms.dto;

public record QuizInput(
  String title,
  String subject,
  int durationMinutes,
  java.util.List<Long> questionIds
) {}
