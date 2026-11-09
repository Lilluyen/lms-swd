package com.example.lms.controller;

import com.example.lms.service.CurrentUserService;
import com.example.lms.service.PaymentService;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PaymentApi {

  private final CurrentUserService currentUser;
  private final PaymentService payments;

  public PaymentApi(CurrentUserService currentUser, PaymentService payments) {
    this.currentUser = currentUser;
    this.payments = payments;
  }

  @PostMapping("/courses/{courseId}/checkout")
  Map<String, Object> checkout(
    @PathVariable Long courseId,
    HttpSession session
  ) {
    return payments.checkout(currentUser.requireStudent(session), courseId);
  }

  @GetMapping("/orders")
  List<Map<String, Object>> orders(HttpSession session) {
    return payments.list(currentUser.requireStudent(session));
  }

  @GetMapping("/orders/{orderId}")
  Map<String, Object> order(@PathVariable Long orderId, HttpSession session) {
    return payments.get(currentUser.requireStudent(session), orderId);
  }

  @PostMapping("/orders/{orderId}/voucher")
  Map<String, Object> applyVoucher(
    @PathVariable Long orderId,
    @RequestBody(required = false) Map<String, Object> body,
    HttpSession session
  ) {
    String code = body == null
      ? ""
      : String.valueOf(body.getOrDefault("code", ""));
    return payments.applyVoucher(
      currentUser.requireStudent(session),
      orderId,
      code
    );
  }

  @PostMapping("/orders/{orderId}/simulate-pay")
  Map<String, Object> simulatePayment(
    @PathVariable Long orderId,
    HttpSession session
  ) {
    return payments.simulatePayment(
      currentUser.requireStudent(session),
      orderId
    );
  }

  @GetMapping("/orders/{orderId}/receipt")
  Map<String, Object> receipt(@PathVariable Long orderId, HttpSession session) {
    return payments.getReceipt(currentUser.requireStudent(session), orderId);
  }

  @PostMapping("/orders/{orderId}/cancel")
  Map<String, Object> cancel(@PathVariable Long orderId, HttpSession session) {
    return payments.cancel(currentUser.requireStudent(session), orderId);
  }

  @PostMapping({ "/payments/sepay-webhook", "/payments/payos/webhook" })
  ResponseEntity<?> webhook(
    @RequestHeader(value = "Authorization", required = false) String authorization,
    @RequestBody Map<String, Object> payload
  ) {
    return payments.receiveWebhook(authorization, payload);
  }
}
