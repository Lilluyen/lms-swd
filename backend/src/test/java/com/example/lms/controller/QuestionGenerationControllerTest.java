package com.example.lms.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.example.lms.dto.AnswerRequest;
import com.example.lms.dto.QuestionGenerationRequest;
import com.example.lms.dto.QuestionRequest;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.User;
import com.example.lms.integration.GeminiProxy;
import com.example.lms.repository.*;
import com.example.lms.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

class QuestionGenerationControllerTest {
  private static final String CONTEXT = "Spring injects dependencies through the application context.";
  private final ObjectMapper mapper = new ObjectMapper();
  private final UserRepository users = mock(UserRepository.class);
  private final QuestionRepository questions = mock(QuestionRepository.class);
  private final AnswerRepository answers = mock(AnswerRepository.class);
  private final QuestionService questionService = mock(QuestionService.class);
  private final ContentAccessService access = mock(ContentAccessService.class);
  private final GeminiProxy proxy = mock(GeminiProxy.class);
  private final User teacher = new User();
  private MockMvc mvc;
  private MockHttpSession session;

  @BeforeEach
  void setup() {
    teacher.id = 7L;
    teacher.role = "TEACHER";
    when(users.findById(teacher.id)).thenReturn(Optional.of(teacher));
    session = new MockHttpSession();
    session.setAttribute("uid", teacher.id);
    var controller = new QuestionController(
      mock(CourseRepository.class), questions, answers, mock(EnrollmentRepository.class),
      mock(CourseReviewRepository.class), mock(WishlistRepository.class), mock(CourseService.class),
      new CurrentUserService(users), questionService,
      new QuestionGenerationService(proxy, access), proxy
    );
    mvc = MockMvcBuilders.standaloneSetup(controller)
      .setControllerAdvice(new GlobalExceptionHandler()).build();
  }

  @Test
  void returnsGroundedDraftsWithoutCallingQuestionPersistenceService() throws Exception {
    when(proxy.generateText(anyString(), anyInt())).thenReturn(drafts(2, CONTEXT));
    generate(input(2, CONTEXT, null), session)
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.length()").value(2))
      .andExpect(jsonPath("$[0].subject").value("Spring Boot"))
      .andExpect(jsonPath("$[0].contextReference").value(CONTEXT))
      .andExpect(jsonPath("$[0].draftId").isNotEmpty());
    verify(proxy).generateText(contains(CONTEXT), eq(1940));
    verifyNoInteractions(questionService, questions, answers, access);
  }

  @Test
  void rejectsAnonymousAndStudentBeforeCallingProxy() throws Exception {
    generate(input(2, CONTEXT, null), new MockHttpSession()).andExpect(status().isUnauthorized());
    teacher.role = "STUDENT";
    generate(input(2, CONTEXT, null), session).andExpect(status().isForbidden());
    verifyNoInteractions(proxy, access, questionService);
  }

  @Test
  void rejectsInvalidContextAndQuantityBeforeCallingProxy() throws Exception {
    generate(input(2, "", null), session)
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.context").exists());
    generate(input(0, CONTEXT, null), session)
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.quantity").exists());
    verifyNoInteractions(proxy, questionService);
  }

  @Test
  void checksLessonOwnershipAndTypeBeforeCallingProxy() throws Exception {
    when(access.ownedLesson(99L, teacher)).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
    generate(input(2, CONTEXT, 99L), session).andExpect(status().isForbidden());
    var video = new Lesson();
    video.contentType = "VIDEO";
    when(access.ownedLesson(100L, teacher)).thenReturn(video);
    generate(input(2, CONTEXT, 100L), session)
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.lessonId").exists());
    verifyNoInteractions(proxy, questionService);
  }

  @Test
  void rejectsNonemptyInvalidAnswersWithoutRetrying() throws Exception {
    when(proxy.generateText(anyString(), anyInt()))
      .thenReturn("not JSON", drafts(2, "A quote absent from the lesson"), drafts(1, CONTEXT));
    for (int i = 0; i < 3; i++) {
      generate(input(2, CONTEXT, null), session).andExpect(status().isBadGateway());
    }
    verify(proxy, times(3)).generateText(anyString(), anyInt());
    verifyNoInteractions(questionService, questions, answers);
  }

  @Test
  void retriesOnlyEmptyAnswersAndReturnsValidatedDrafts() throws Exception {
    when(proxy.generateText(anyString(), anyInt()))
      .thenThrow(new GeminiProxy.EmptyAnswerException())
      .thenThrow(new GeminiProxy.EmptyAnswerException())
      .thenReturn(drafts(2, CONTEXT));
    generate(input(2, CONTEXT, null), session)
      .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    verify(proxy, times(3)).generateText(anyString(), anyInt());
    verifyNoInteractions(questionService, questions, answers);
  }

  @Test
  void stopsAfterThreeEmptyAnswers() throws Exception {
    when(proxy.generateText(anyString(), anyInt())).thenThrow(new GeminiProxy.EmptyAnswerException());
    generate(input(2, CONTEXT, null), session).andExpect(status().isBadGateway());
    verify(proxy, times(3)).generateText(anyString(), anyInt());
  }

  @Test
  void preservesProviderErrorStatusesWithoutRetrying() throws Exception {
    for (HttpStatus code : List.of(HttpStatus.SERVICE_UNAVAILABLE, HttpStatus.GATEWAY_TIMEOUT, HttpStatus.BAD_GATEWAY)) {
      reset(proxy);
      when(proxy.generateText(anyString(), anyInt())).thenThrow(new ResponseStatusException(code));
      generate(input(2, CONTEXT, null), session).andExpect(status().is(code.value()));
      verify(proxy).generateText(anyString(), anyInt());
    }
  }

  @Test
  void bulkSaveStillUsesQuestionServiceWithoutCallingProxy() throws Exception {
    var request = new QuestionRequest("Spring Boot", "A reviewed question?", "MEDIUM", "Explanation",
      List.of(new AnswerRequest("Correct answer", true), new AnswerRequest("Wrong answer", false)));
    when(questionService.createAll(teacher, List.of(request))).thenReturn(List.of());
    mvc.perform(post("/api/questions/bulk").session(session).contentType(MediaType.APPLICATION_JSON)
      .content(mapper.writeValueAsString(List.of(request)))).andExpect(status().isOk());
    verify(questionService).createAll(teacher, List.of(request));
    verifyNoInteractions(proxy, access, questions, answers);
  }

  private QuestionGenerationRequest input(int quantity, String context, Long lessonId) {
    return new QuestionGenerationRequest("Spring Boot", "Dependency Injection", "MEDIUM", quantity,
      "MULTIPLE_CHOICE", "", "VIETNAMESE", context, lessonId);
  }

  private org.springframework.test.web.servlet.ResultActions generate(
    QuestionGenerationRequest input, MockHttpSession requestSession
  ) throws Exception {
    return mvc.perform(post("/api/questions/generate").session(requestSession)
      .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(input)));
  }

  private String drafts(int count, String reference) throws Exception {
    var drafts = new ArrayList<Map<String, Object>>();
    for (int i = 0; i < count; i++) {
      drafts.add(Map.of("content", "How does Spring inject dependency " + i + "?",
        "explanation", "Uses the application context.", "contextReference", reference,
        "answers", List.of(Map.of("content", "Application context", "correct", true),
          Map.of("content", "Operating system", "correct", false))));
    }
    return mapper.writeValueAsString(drafts);
  }
}
