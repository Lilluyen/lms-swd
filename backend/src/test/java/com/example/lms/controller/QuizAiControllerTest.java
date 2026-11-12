package com.example.lms.controller;

import com.example.lms.dto.QuizAiRequest;
import com.example.lms.entity.User;
import com.example.lms.repository.UserRepository;
import com.example.lms.service.CurrentUserService;
import com.example.lms.service.QuizAiService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QuizAiControllerTest {
  @Test
  void rejectsUnauthenticatedAndStudentRequestsBeforeGenerating() {
    var users = mock(UserRepository.class);
    var ai = mock(QuizAiService.class);
    var controller = new QuizAiController(ai, new CurrentUserService(users));
    var session = new MockHttpSession();
    var input = new QuizAiRequest("TFT cơ bản", "TFT", "EASY", 5);
    assertEquals(401, assertThrows(ResponseStatusException.class,
      () -> controller.draft(input, session)).getStatusCode().value());
    var student = new User();
    student.id = 7L;
    student.role = "STUDENT";
    session.setAttribute("uid", student.id);
    when(users.findById(student.id)).thenReturn(Optional.of(student));
    assertEquals(403, assertThrows(ResponseStatusException.class,
      () -> controller.draft(input, session)).getStatusCode().value());
    verifyNoInteractions(ai);
  }
}
