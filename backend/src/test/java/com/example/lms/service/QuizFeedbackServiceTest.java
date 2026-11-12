package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.integration.GeminiProxy;
import com.example.lms.repository.QuizResultRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class QuizFeedbackServiceTest {
  @Test
  void analyzesSavedEvidenceAndReusesCachedFeedback() {
    var quizzes = mock(QuizService.class);
    var results = mock(QuizResultRepository.class);
    var ai = mock(GeminiProxy.class);
    var service = new QuizFeedbackService(quizzes, results, ai, new ObjectMapper());
    var student = new User();
    var result = new QuizResult();
    result.quiz = new Quiz();
    result.quiz.title = "TFT cơ bản";
    result.quiz.subject = "TFT";
    result.score = 0;
    result.total = 1;
    when(results.findById(1L)).thenReturn(Optional.of(result));
    when(quizzes.result(1L, student)).thenReturn(Map.of("answers", List.of(
      Map.of("question", "Câu hỏi mẫu", "selected", "Chưa trả lời", "correct", false))));
    when(ai.generateText(anyString(), anyInt())).thenReturn("Cần ôn câu 1.");
    assertEquals("Cần ôn câu 1.", service.analyze(1L, student).get("feedback"));
    assertEquals("Cần ôn câu 1.", service.analyze(1L, student).get("feedback"));
    verify(ai, times(1)).generateText(contains("Chưa trả lời"), anyInt());
    verify(results, times(1)).save(result);
  }

  @Test
  void deniesOtherStudentsBeforeReadingCachedFeedback() {
    var quizzes = mock(QuizService.class);
    var results = mock(QuizResultRepository.class);
    var ai = mock(GeminiProxy.class);
    var student = new User();
    when(quizzes.result(1L, student)).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
    var service = new QuizFeedbackService(quizzes, results, ai, new ObjectMapper());
    assertThrows(ResponseStatusException.class, () -> service.analyze(1L, student));
    verifyNoInteractions(results, ai);
  }
}
