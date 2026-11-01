package com.example.lms.dto;

public record QuestionInput(
  String subject,
  String content,
  String difficulty,
  String explanation,
  java.util.List<AnswerInput> answers
) {}
