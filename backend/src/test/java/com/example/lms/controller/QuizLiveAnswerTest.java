package com.example.lms.controller;

import com.example.lms.dto.Submission;
import com.example.lms.entity.*;
import com.example.lms.repository.*;
import com.example.lms.service.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class QuizLiveAnswerTest {
  @Test
  void submitsFinalStudentChoicesOnlyAfterSubmission() {
    var users = mock(UserRepo.class);
    var service = mock(QuizService.class);
    var api = new QuizApi(mock(CourseRepo.class), mock(QuestionRepo.class), mock(AnswerRepo.class),
      mock(EnrollmentRepo.class), mock(CourseReviewRepo.class), mock(WishlistRepo.class),
      mock(CourseService.class), new CurrentUserService(users), service);
    var student = new User(); student.id = 1L; student.role = "STUDENT";
    when(users.findById(1L)).thenReturn(Optional.of(student));
    var session = new MockHttpSession(); session.setAttribute("uid", 1L);
    when(service.start(2L, student)).thenReturn(Map.of("durationMinutes", 5));
    api.start(2L, session);
    var result = new QuizResult();
    when(service.submit(eq(2L), any(), eq(student), any())).thenReturn(result);
    assertSame(result, api.submit(2L, new Submission(Map.of(3L, 5L)), session));
    verify(service).submit(eq(2L), eq(new Submission(Map.of(3L, 5L))), eq(student), any());
    assertNull(session.getAttribute("quiz-start-2"));
    assertNull(session.getAttribute("quiz-checked-2"));
  }
}
