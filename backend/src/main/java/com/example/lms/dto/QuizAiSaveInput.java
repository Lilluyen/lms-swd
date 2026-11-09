package com.example.lms.dto;

import java.util.List;

public record QuizAiSaveInput(
  String title, String subject, int durationMinutes, List<QuestionInput> questions
) {}
