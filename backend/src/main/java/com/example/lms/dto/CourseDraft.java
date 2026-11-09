package com.example.lms.dto;

import java.util.List;

public record CourseDraft(
  String title,
  String description,
  String level,
  Double price,
  String category,
  String context,
  List<ModuleDraft> modules
) {
  public record ModuleDraft(
    String title,
    String description,
    List<LessonDraft> lessons
  ) {}

  public record LessonDraft(
    String title,
    String contentType,
    String content,
    Integer durationMinutes
  ) {}
}
