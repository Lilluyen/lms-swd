package com.example.lms.controller;

import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> status(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(
      Map.of(
        "message",
        e.getReason() == null
          ? "Không có quyền hoặc chưa đăng nhập"
          : e.getReason()
      )
    );
  }

  @ExceptionHandler(com.example.lms.web.FieldValidationException.class)
  ResponseEntity<?> fields(com.example.lms.web.FieldValidationException e) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("message", "Vui lòng kiểm tra lại các trường được đánh dấu");
    body.put("errors", e.errors);
    return ResponseEntity.badRequest().body(body);
  }

  @ExceptionHandler(NoSuchElementException.class)
  ResponseEntity<?> missing() {
    return ResponseEntity.status(404).body(
      Map.of("message", "Không tìm thấy dữ liệu")
    );
  }

  @ExceptionHandler(
    org.springframework.dao.DataIntegrityViolationException.class
  )
  ResponseEntity<?> conflict() {
    return ResponseEntity.status(409).body(
      Map.of("message", "Dữ liệu bị trùng hoặc đang được sử dụng")
    );
  }

  @ExceptionHandler(
    org.springframework.http.converter.HttpMessageNotReadableException.class
  )
  ResponseEntity<?> invalid() {
    return ResponseEntity.badRequest().body(
      Map.of("message", "Dữ liệu gửi lên không hợp lệ")
    );
  }
}
