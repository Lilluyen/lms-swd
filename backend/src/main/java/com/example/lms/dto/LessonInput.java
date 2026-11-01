package com.example.lms.dto;

/** Payload for creating or updating a lesson. */
public record LessonInput(
  Long moduleId,
  String title,
  String contentType,
  String content,
  String videoUrl,
  Integer durationMinutes,
  Integer position,
  String fileUrl,
  String fileName
) {}
