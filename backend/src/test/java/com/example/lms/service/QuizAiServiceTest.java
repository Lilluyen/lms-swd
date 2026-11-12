package com.example.lms.service;

import com.example.lms.dto.*;
import com.example.lms.entity.Question;
import com.example.lms.entity.Quiz;
import com.example.lms.entity.User;
import com.example.lms.integration.GeminiProxy;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class QuizAiServiceTest {
  private GeminiProxy geminiProxy;
  private QuestionService questions;
  private QuizService quizzes;
  private QuizAiService service;
  private static final String JSON = """
    [{"content":"TFT viết tắt của tên trò chơi nào?",
      "explanation":"TFT viết tắt của Teamfight Tactics.",
      "answers":[{"content":"Teamfight Tactics","correct":true},
        {"content":"Team Fortress","correct":false},
        {"content":"Total Fantasy","correct":false},
        {"content":"The Final Tournament","correct":false}]}]
    """;

  @BeforeEach
  void setup() {
    geminiProxy = mock(GeminiProxy.class);
    questions = mock(QuestionService.class);
    quizzes = mock(QuizService.class);
    service = new QuizAiService(geminiProxy, new ObjectMapper(),
      mock(SupportService.class, CALLS_REAL_METHODS), questions, quizzes);
  }

  private QuizAiRequest criteria(int quantity) {
    return new QuizAiRequest("Làm quen với TFT", "TFT cho người mới bắt đầu", "EASY", quantity);
  }

  @Test
  void generatesReviewableDraftUsingBothTitleAndSubjectWithoutSaving() {
    when(geminiProxy.generateText(anyString(), anyInt())).thenReturn("```json\n" + JSON + "\n```");
    var drafts = service.draft(criteria(1));
    assertEquals(1, drafts.size());
    assertEquals(criteria(1).subject(), drafts.get(0).subject());
    assertEquals("EASY", drafts.get(0).difficulty());
    var prompt = ArgumentCaptor.forClass(String.class);
    verify(geminiProxy).generateText(prompt.capture(), anyInt());
    assertTrue(prompt.getValue().contains(criteria(1).title()));
    assertTrue(prompt.getValue().contains(criteria(1).subject()));
    verifyNoInteractions(questions, quizzes);
  }

  @Test
  void rejectsInvalidQuantityBeforeCallingAi() {
    var error = assertThrows(ResponseStatusException.class, () -> service.draft(criteria(21)));
    assertEquals(400, error.getStatusCode().value());
    verifyNoInteractions(geminiProxy, questions, quizzes);
  }

  @Test
  void rejectsWrongCountAndMultipleCorrectAnswers() {
    when(geminiProxy.generateText(anyString(), anyInt())).thenReturn(JSON);
    assertEquals(502, assertThrows(ResponseStatusException.class,
      () -> service.draft(criteria(2))).getStatusCode().value());
    when(geminiProxy.generateText(anyString(), anyInt()))
      .thenReturn(JSON.replace("\"Team Fortress\",\"correct\":false", "\"Team Fortress\",\"correct\":true"));
    assertEquals(502, assertThrows(ResponseStatusException.class,
      () -> service.draft(criteria(1))).getStatusCode().value());
    verifyNoInteractions(questions, quizzes);
  }

  @Test
  void savesReviewedQuestionsUnderCurrentTeacherAndLinksQuiz() {
    when(geminiProxy.generateText(anyString(), anyInt())).thenReturn(JSON);
    var drafts = service.draft(criteria(1));
    var teacher = new User();
    teacher.id = 42L;
    var question = new Question();
    question.id = 123L;
    when(questions.create(teacher, drafts.get(0))).thenReturn(Map.of("question", question));
    var quiz = new Quiz();
    when(quizzes.create(any(), eq(teacher))).thenReturn(quiz);
    assertSame(quiz, service.save(new QuizAiSaveRequest(criteria(1).title(), criteria(1).subject(), 15, drafts), teacher));
    assertTrue(question.aiGenerated);
    verify(quizzes).create(new QuizRequest(criteria(1).title(), criteria(1).subject(), 15, List.of(123L)), teacher);
  }

  @Test
  void rejectsChangedSubjectAndInvalidDurationWithoutSaving() {
    when(geminiProxy.generateText(anyString(), anyInt())).thenReturn(JSON);
    var drafts = service.draft(criteria(1));
    assertThrows(ResponseStatusException.class, () -> service.save(
      new QuizAiSaveRequest("Tiêu đề khác", "Môn học khác", 20, drafts), new User()));
    assertThrows(ResponseStatusException.class, () -> service.save(
      new QuizAiSaveRequest(criteria(1).title(), criteria(1).subject(), 0, drafts), new User()));
    verifyNoInteractions(questions, quizzes);
  }
}
