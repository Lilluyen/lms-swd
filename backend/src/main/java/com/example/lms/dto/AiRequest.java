package com.example.lms.dto;

/**
 * Request for the shared "Generate with AI" dialog.
 *
 * `context` is optional free text supplied by the teacher (audience, tools,
 * scope…). When the course has its own saved context, the backend uses it as a
 * fallback so generations stay consistent without retyping it every time.
 */
public record AiRequest(
  String topic,
  String objective,
  String context,
  String level,
  String contentType,
  String language,
  Long courseId,
  Long moduleId,
  Long lessonId
) {}
