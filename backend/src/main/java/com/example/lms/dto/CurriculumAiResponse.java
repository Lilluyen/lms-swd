package com.example.lms.dto;

import java.util.List;

public record CurriculumAiResponse(
  String topic,
  List<CourseDraft.ModuleDraft> modules
) {}
