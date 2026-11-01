package com.example.lms.controller;

import com.example.lms.dto.Credentials;
import com.example.lms.dto.Profile;
import com.example.lms.entity.User;
import com.example.lms.repository.UserRepo;
import com.example.lms.service.CurrentUserService;
import com.example.lms.service.SupportService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@Transactional
public class AuthApi {
  private final UserRepo users;
  private final PasswordEncoder encoder;
  private final SupportService support;
  private final CurrentUserService currentUser;

  public AuthApi(UserRepo users, PasswordEncoder encoder, SupportService support, CurrentUserService currentUser) {
    this.users = users;
    this.encoder = encoder;
    this.support = support;
    this.currentUser = currentUser;
  }

  @GetMapping("/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken());
  }

  @PostMapping("/register")
  Profile register(@RequestBody Credentials input, HttpSession session) {
    if (input.email() == null || !input.email().matches("^[^@ ]+@[^@ ]+\\.[^@ ]+$") || input.password() == null || input.password().length() < 8)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid email and password of at least 8 characters required");
    String email = input.email().toLowerCase();
    if (users.findByEmail(email).isPresent())
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
    User user = new User();
    user.email = email;
    user.name = support.text(input.name(), 2, 100, "Họ tên");
    user.role = "TEACHER".equals(input.role()) ? "TEACHER" : "STUDENT";
    user.roleDefinition = support.role(user.role);
    user.passwordHash = encoder.encode(input.password());
    users.save(user);
    session.setAttribute("uid", user.id);
    return profile(user);
  }

  @PostMapping("/login")
  Profile login(@RequestBody Credentials input, HttpServletRequest request) {
    User user = users.findByEmail(input.email() == null ? "" : input.email().trim().toLowerCase())
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    if (input.password() == null || user.passwordHash == null || !encoder.matches(input.password(), user.passwordHash))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    request.getSession(true);
    request.changeSessionId();
    request.getSession().setAttribute("uid", user.id);
    return profile(user);
  }

  @GetMapping("/me")
  Profile me(HttpSession session) {
    return profile(currentUser.require(session));
  }

  @PutMapping("/profile")
  Profile updateProfile(@RequestBody Map<String, String> input, HttpSession session) {
    User user = currentUser.require(session);
    user.name = support.text(input.get("name"), 2, 100, "Họ tên");
    user.phone = input.getOrDefault("phone", "");
    user.bio = input.getOrDefault("bio", "");
    return profile(users.save(user));
  }

  private Profile profile(User user) {
    return new Profile(user.id, user.name, user.email, user.role);
  }
}
