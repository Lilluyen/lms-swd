package com.example.lms.controller;

import com.example.lms.dto.QuizAiInput;
import com.example.lms.entity.User;
import com.example.lms.repository.UserRepo;
import com.example.lms.service.CurrentUserService;
import com.example.lms.service.QuizAiService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QuizAiApiTest {
  @Test
  void rejectsUnauthenticatedAndStudentRequestsBeforeGenerating() {
    var users = mock(UserRepo.class);
    var ai = mock(QuizAiService.class);
    var controller = new QuizAiApi(ai, new CurrentUserService(users));
    var session = new MockHttpSession();
    var input = new QuizAiInput("TFT cơ bản", "TFT", "EASY", 5);
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
