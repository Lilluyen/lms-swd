package com.example.lms.dto;

import java.math.BigDecimal;

/** Payload for creating or updating a course from the teacher screens. */
public record CourseRequest(
  String title,
  String description,
  String level,
  BigDecimal price,
  String cover,
  String status,
  String category,
  String context
) {}
