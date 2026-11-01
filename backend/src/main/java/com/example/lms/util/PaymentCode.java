package com.example.lms.util;

import java.util.UUID;

public final class PaymentCode {

  private PaymentCode() {}

  public static String newCode() {
    return (
      "LMS" +
      UUID.randomUUID()
        .toString()
        .replace("-", "")
        .substring(0, 14)
        .toUpperCase()
    );
  }
}
