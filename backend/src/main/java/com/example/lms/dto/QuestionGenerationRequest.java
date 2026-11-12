package com.example.lms.dto;

public record QuestionGenerationRequest(
  String subject,
  String topic,
  String difficulty,
  int quantity,
  String questionType,
  String instructions,
  String language,
  String context,
  Long lessonId
) {}
