package com.example.lms.web;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Validation failure with a message per form field so the UI can show the
 * error directly under the offending input.
 */
public class FieldValidationException extends RuntimeException {

  public final Map<String, String> errors;

  public FieldValidationException(Map<String, String> errors) {
    super("Dữ liệu không hợp lệ");
    this.errors = new LinkedHashMap<>(errors);
  }

  public FieldValidationException(String field, String message) {
    this(Map.of(field, message));
  }

  public static void put(Map<String, String> target, String field, String message) {
    target.putIfAbsent(field, message);
  }
}
