package com.example.lms.dto;

public record QuizRequest(
  String title,
  String subject,
  int durationMinutes,
  java.util.List<Long> questionIds
) {}
