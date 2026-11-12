package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.*;
import com.example.lms.integration.Integrations;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QuizAnswerCheckTest {
  @Test
  void hidesAnswersUntilSubmissionAndRequiresActiveAttempt() {
    var quizzes = mock(QuizRepo.class);
    var links = mock(QuizQuestionRepo.class);
    var answers = mock(AnswerRepo.class);
    var service = new QuizService(quizzes, links, mock(QuizResultRepo.class),
      mock(QuizAnswerRepo.class), mock(QuestionRepo.class), answers,
      mock(Integrations.class), mock(SupportService.class));
    var student = new User(); student.id = 1L; student.role = "STUDENT";
    var teacher = new User(); teacher.id = 2L; teacher.role = "TEACHER";
    var quiz = new Quiz(); quiz.id = 3L; quiz.owner = teacher; quiz.durationMinutes = 5;
    var question = new Question(); question.id = 4L; question.content = "Câu hỏi mẫu"; question.explanation = "Giải thích mẫu";
    var link = new QuizQuestion(); link.question = question;
    var right = new Answer(); right.id = 5L; right.content = "Đúng"; right.correct = true;
    var wrong = new Answer(); wrong.id = 6L; wrong.content = "Sai";
    when(quizzes.findById(3L)).thenReturn(Optional.of(quiz));
    when(links.findByQuizIdOrderByPosition(3L)).thenReturn(List.of(link));
    when(answers.findByQuestionId(4L)).thenReturn(List.of(right, wrong));
    assertThrows(ResponseStatusException.class, () -> service.submit(3L,
      new com.example.lms.dto.Submission(Map.of(4L, 5L)), student, null));
    assertThrows(ResponseStatusException.class, () -> service.submit(3L,
      new com.example.lms.dto.Submission(Map.of(4L, 5L)), student, Instant.now().minusSeconds(400)));
    // Quiz detail must never reveal correctness before submission.
    var detail = service.detail(3L, student);
    String json = new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(detail.get("questions")).toString();
    assertFalse(json.contains("correct"));
    assertFalse(json.contains("explanation"));
  }
}