package com.example.lms.dto;

import java.util.List;

public record CourseChatRequest(
  String message,
  List<ChatMessage> history,
  CourseDraft currentDraft
) {
  public record ChatMessage(String role, String content) {}
}
