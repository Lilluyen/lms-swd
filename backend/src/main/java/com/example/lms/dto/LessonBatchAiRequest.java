package com.example.lms.dto;

public record LessonBatchAiRequest(
  Long courseId,
  Long moduleId,
  String topic,
  String context,
  Integer lessonCount,
  String language
) {}
