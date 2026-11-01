package com.example.lms.web;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Validation failure with a message per form field so the UI can show the
 * error directly under the offending input.
 */
public class FieldErrors extends RuntimeException {

  public final Map<String, String> errors;

  public FieldErrors(Map<String, String> errors) {
    super("Dữ liệu không hợp lệ");
    this.errors = new LinkedHashMap<>(errors);
  }

  public FieldErrors(String field, String message) {
    this(Map.of(field, message));
  }

  public static void put(Map<String, String> target, String field, String message) {
    target.putIfAbsent(field, message);
  }
}
