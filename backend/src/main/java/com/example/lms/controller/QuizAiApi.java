package com.example.lms.controller;

import com.example.lms.dto.*;
import com.example.lms.entity.Quiz;
import com.example.lms.service.CurrentUserService;
import com.example.lms.service.QuizAiService;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/quizzes/ai")
public class QuizAiApi {
  private final QuizAiService ai;
  private final CurrentUserService currentUser;

  public QuizAiApi(QuizAiService ai, CurrentUserService currentUser) {
    this.ai = ai;
    this.currentUser = currentUser;
  }

  @PostMapping("/draft")
  public List<QuestionInput> draft(@RequestBody QuizAiInput input, HttpSession session) {
    currentUser.requireTeacher(session);
    return ai.draft(input);
  }

  @PostMapping
  public Quiz save(@RequestBody QuizAiSaveInput input, HttpSession session) {
    return ai.save(input, currentUser.requireTeacher(session));
  }
}
