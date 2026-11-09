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
  void gradesOnlyAnswersFromCurrentQuizWithinActiveTime() {
    var quizzes = mock(QuizRepo.class);
    var links = mock(QuizQuestionRepo.class);
    var answers = mock(AnswerRepo.class);
    var service = new QuizService(quizzes, links, mock(QuizResultRepo.class),
      mock(QuizAnswerRepo.class), mock(QuestionRepo.class), answers,
      mock(Integrations.class), mock(SupportService.class));
    var student = new User(); student.id = 1L; student.role = "STUDENT";
    var teacher = new User(); teacher.id = 2L; teacher.role = "TEACHER";
    var quiz = new Quiz(); quiz.id = 3L; quiz.owner = teacher; quiz.durationMinutes = 5;
    var question = new Question(); question.id = 4L; question.explanation = "Giải thích mẫu";
    var link = new QuizQuestion(); link.question = question;
    var right = new Answer(); right.id = 5L; right.content = "Đúng"; right.correct = true;
    var wrong = new Answer(); wrong.id = 6L; wrong.content = "Sai";
    when(quizzes.findById(3L)).thenReturn(Optional.of(quiz));
    when(links.findByQuizIdOrderByPosition(3L)).thenReturn(List.of(link));
    when(answers.findByQuestionId(4L)).thenReturn(List.of(right, wrong));
    var feedback = service.checkAnswer(3L, 4L, 6L, student, Instant.now());
    assertEquals(false, feedback.get("correct"));
    assertEquals(5L, feedback.get("correctAnswerId"));
    assertEquals(true, service.checkAnswer(3L, 4L, 5L, student, Instant.now()).get("correct"));
    assertThrows(ResponseStatusException.class, () -> service.checkAnswer(3L, 99L, 5L, student, Instant.now()));
    assertThrows(ResponseStatusException.class, () -> service.checkAnswer(3L, 4L, 99L, student, Instant.now()));
    assertThrows(ResponseStatusException.class, () -> service.checkAnswer(3L, 4L, 5L, student, null));
    assertThrows(ResponseStatusException.class, () -> service.checkAnswer(3L, 4L, 5L, student, Instant.now().minusSeconds(301)));
  }
}
