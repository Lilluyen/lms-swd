package com.example.lms.dto;

public record QuestionRequest(
  String subject,
  String content,
  String difficulty,
  String explanation,
  java.util.List<AnswerRequest> answers
) {}
