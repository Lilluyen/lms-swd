package com.example.lms.dto;

public record CurriculumAiRequest(
  Long courseId,
  String topic,
  String context,
  Integer moduleCount,
  Integer lessonsPerModule,
  String language
) {}
