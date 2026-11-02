package com.example.lms.dto;

import java.util.List;

public record ApplyCurriculumRequest(
  List<CourseDraft.ModuleDraft> modules
) {}
