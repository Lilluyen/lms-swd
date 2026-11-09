package com.example.lms.dto;

import java.util.List;

public record LessonBatchAiResponse(
  String moduleTitle,
  List<CourseDraft.LessonDraft> lessons
) {}
