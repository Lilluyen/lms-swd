package com.example.lms.service;

import com.example.lms.entity.User;
import com.example.lms.repository.UserRepo;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CurrentUserService {
  private final UserRepo users;

  public CurrentUserService(UserRepo users) {
    this.users = users;
  }

  public User require(HttpSession session) {
    Long id = (Long) session.getAttribute("uid");
    if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  }

  public User requireStudent(HttpSession session) {
    return requireRole(session, "STUDENT");
  }

  public User requireTeacher(HttpSession session) {
    return requireRole(session, "TEACHER");
  }

  private User requireRole(HttpSession session, String role) {
    User user = require(session);
    if (!role.equals(user.role)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    return user;
  }
}
