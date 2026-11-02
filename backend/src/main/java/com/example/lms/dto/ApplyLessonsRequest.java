package com.example.lms.dto;

import java.util.List;

public record ApplyLessonsRequest(
  List<CourseDraft.LessonDraft> lessons
) {}
