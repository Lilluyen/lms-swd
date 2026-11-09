package com.example.lms.controller;

import com.example.lms.service.CurrentUserService;
import com.example.lms.service.QuizFeedbackService;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/results")
public class QuizFeedbackApi {
  private final QuizFeedbackService feedback;
  private final CurrentUserService users;
  public QuizFeedbackApi(QuizFeedbackService feedback, CurrentUserService users) {
    this.feedback = feedback;
    this.users = users;
  }
  @PostMapping("/{id}/analysis")
  public Map<String, String> analyze(@PathVariable Long id, HttpSession session) {
    return feedback.analyze(id, users.requireStudent(session));
  }
}
