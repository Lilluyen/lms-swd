package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.CourseOrder;
import com.example.lms.entity.Enrollment;
import com.example.lms.entity.User;
import com.example.lms.integration.PayOSClient;
import com.example.lms.repository.CourseOrderRepo;
import com.example.lms.repository.CourseRepo;
import com.example.lms.repository.EnrollmentRepo;
import com.example.lms.util.PaymentCode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PaymentService {

  private static final DateTimeFormatter VN_TIME_FMT =
    DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss 'GMT+7'").withZone(
      ZoneId.of("Asia/Ho_Chi_Minh")
    );

  private final CourseRepo courses;
  private final CourseOrderRepo orders;
  private final EnrollmentRepo enrollments;
  private final PayOSClient payosClient;
  private final String account;
  private final String bank;
  private final String accountName;
  private final String webhookKey;

  public PaymentService(
    CourseRepo courses,
    CourseOrderRepo orders,
    EnrollmentRepo enrollments,
    PayOSClient payosClient,
    @Value("${app.sepay.account:}") String account,
    @Value("${app.sepay.bank:}") String bank,
    @Value("${app.sepay.account-name:}") String accountName,
    @Value("${app.sepay.webhook-key:}") String webhookKey
  ) {
    this.courses = courses;
    this.orders = orders;
    this.enrollments = enrollments;
    this.payosClient = payosClient;
    this.account = account;
    this.bank = bank;
    this.accountName = accountName;
    this.webhookKey = webhookKey;
  }

  public Map<String, Object> checkout(User student, Long courseId) {
    Course course = courses.findById(courseId).orElseThrow();
    if (!course.published) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST
    );
    if (
      enrollments.existsByStudentIdAndCourseId(student.id, courseId)
    ) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Already enrolled"
    );
    if (course.price == null || course.price.signum() <= 0) {
      Enrollment enrollment = new Enrollment();
      enrollment.student = student;
      enrollment.course = course;
      enrollment.status = "ACTIVE";
      enrollments.save(enrollment);
      return Map.of("free", true);
    }
    ensureConfigured();
    for (CourseOrder existing : orders.findByStudentIdAndCourseIdOrderByCreatedAtDesc(
      student.id,
      courseId
    )) {
      expire(existing);
      orders.save(existing);
      if ("PENDING".equals(existing.status)) return view(existing);
    }
    CourseOrder order = new CourseOrder();
    order.student = student;
    order.course = course;
    order.originalAmount = course.price;
    order.discountAmount = BigDecimal.ZERO;
    order.amount = course.price;
    order.paymentCode = PaymentCode.newCode();
    order.expiresAt = Instant.now().plusSeconds(15 * 60);
    return view(orders.save(order));
  }

  public Map<String, Object> applyVoucher(
    User student,
    Long orderId,
    String rawCode
  ) {
    CourseOrder order = ownedOrder(student, orderId);
    expire(order);
    if (!"PENDING".equals(order.status)) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "Chỉ đơn đang chờ thanh toán mới có thể áp dụng mã giảm giá"
      );
    }
    BigDecimal basePrice = order.originalAmount != null
      ? order.originalAmount
      : order.course.price;
    order.originalAmount = basePrice;

    String code = rawCode == null ? "" : rawCode.trim().toUpperCase();
    if (code.isEmpty()) {
      order.voucherCode = null;
      order.discountAmount = BigDecimal.ZERO;
      order.amount = basePrice;
      order.paymentCode = PaymentCode.newCode();
      order.expiresAt = Instant.now().plusSeconds(15 * 60);
      return view(orders.save(order));
    }

    BigDecimal discount;
    switch (code) {
      case "LEARNOVA50" -> discount = basePrice
        .multiply(new BigDecimal("0.50"))
        .setScale(0, RoundingMode.DOWN);
      case "STUDENT20" -> discount = basePrice
        .multiply(new BigDecimal("0.20"))
        .setScale(0, RoundingMode.DOWN);
      case "SWD2026" -> discount = new BigDecimal("100000").min(basePrice);
      case "TEST2K" -> discount = basePrice
        .subtract(new BigDecimal("2000"))
        .max(BigDecimal.ZERO);
      case "FREE100" -> discount = basePrice;
      default -> throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Mã giảm giá '" +
          code +
          "' không hợp lệ. Các mã khả dụng: LEARNOVA50 (-50%), STUDENT20 (-20%), SWD2026 (-100.000đ), TEST2K (còn 2.000đ)"
      );
    }

    BigDecimal finalAmount = basePrice.subtract(discount).max(BigDecimal.ZERO);
    order.voucherCode = code;
    order.discountAmount = discount;
    order.amount = finalAmount;

    if (finalAmount.signum() == 0) {
      order.status = "PAID";
      order.paidAmount = BigDecimal.ZERO;
      order.paymentDate = Instant.now();
      order.transactionReference = "VOUCHER-" + order.paymentCode;
      if (
        !enrollments.existsByStudentIdAndCourseId(
          order.student.id,
          order.course.id
        )
      ) {
        Enrollment enrollment = new Enrollment();
        enrollment.student = order.student;
        enrollment.course = order.course;
        enrollment.status = "ACTIVE";
        enrollments.save(enrollment);
      }
      return view(orders.save(order));
    }

    order.paymentCode = PaymentCode.newCode();
    order.expiresAt = Instant.now().plusSeconds(15 * 60);
    return view(orders.save(order));
  }

  public Map<String, Object> simulatePayment(User student, Long orderId) {
    CourseOrder order = ownedOrder(student, orderId);
    expire(order);
    if ("PAID".equals(order.status)) {
      return view(order);
    }
    if (!"PENDING".equals(order.status)) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "Phiên thanh toán đã hết hạn hoặc bị hủy"
      );
    }
    String demoRef = "PAYOS-" + System.currentTimeMillis();
    order.webhookPayload =
      "{\"id\":\"" +
      demoRef +
      "\",\"code\":\"" +
      order.paymentCode +
      "\",\"transferAmount\":" +
      order.amount +
      ",\"transferType\":\"in\",\"gateway\":\"PayOS/SEPay\"}";
    reconcile(order, order.amount, demoRef);
    return view(order);
  }

  public Map<String, Object> getReceipt(User student, Long orderId) {
    CourseOrder order = ownedOrder(student, orderId);
    expire(order);
    orders.save(order);
    return view(order);
  }

  public List<Map<String, Object>> list(User student) {
    return orders.findByStudentId(student.id).stream().map(this::view).toList();
  }

  public Map<String, Object> get(User student, Long orderId) {
    return view(ownedOrder(student, orderId));
  }

  public Map<String, Object> cancel(User student, Long orderId) {
    CourseOrder order = ownedOrder(student, orderId);
    expire(order);
    if ("PAID".equals(order.status)) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Đơn đã thanh toán và không thể hủy"
    );
    if ("PENDING".equals(order.status)) {
      order.status = "CANCELLED";
      order.cancelledAt = Instant.now();
      orders.save(order);
    }
    return view(order);
  }

  public ResponseEntity<?> receiveWebhook(
    String authorization,
    Map<String, Object> payload
  ) {
    if (!payosClient.verifyWebhookSignature(authorization, payload)) {
      return ResponseEntity.status(401).build();
    }
    if (
      account.isBlank() ||
      !account.equals(String.valueOf(payload.getOrDefault("accountNumber", "")))
    ) return ResponseEntity.ok(Map.of("success", true));
    BigDecimal transfer;
    try {
      transfer = new BigDecimal(String.valueOf(payload.get("transferAmount")));
    } catch (Exception error) {
      return ResponseEntity.badRequest().build();
    }
    if (
      !"in".equalsIgnoreCase(
        String.valueOf(payload.getOrDefault("transferType", ""))
      )
    ) return ResponseEntity.ok(Map.of("success", true));
    String reference = String.valueOf(payload.getOrDefault("id", ""));
    if (reference.isBlank()) return ResponseEntity.badRequest().build();
    if (
      orders
        .findAll()
        .stream()
        .anyMatch(order -> reference.equals(order.transactionReference))
    ) return ResponseEntity.ok(Map.of("success", true));
    String content = String.valueOf(payload.getOrDefault("content", ""));
    String code = String.valueOf(payload.getOrDefault("code", ""));
    orders
      .findAll()
      .stream()
      .filter(
        order ->
          code.equalsIgnoreCase(order.paymentCode) ||
          content.toUpperCase().contains(order.paymentCode.toUpperCase())
      )
      .findFirst()
      .ifPresent(order -> {
        order.webhookPayload = payload.toString();
        reconcile(order, transfer, reference);
      });
    return ResponseEntity.ok(Map.of("success", true));
  }

  private CourseOrder ownedOrder(User student, Long orderId) {
    CourseOrder order = orders.findById(orderId).orElseThrow();
    if (!order.student.id.equals(student.id)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN
    );
    return order;
  }

  private void reconcile(
    CourseOrder order,
    BigDecimal transfer,
    String reference
  ) {
    expire(order);
    order.transactionReference = reference;
    order.paymentDate = Instant.now();
    order.paidAmount = transfer;
    if (transfer.compareTo(order.amount) < 0) {
      order.status = "UNDERPAID";
      order.reconciliationNote = "Số tiền nhận được thấp hơn giá trị đơn";
    } else if (!"PENDING".equals(order.status)) {
      order.status = "LATE_PAYMENT";
      order.reconciliationNote =
        "Thanh toán đến sau khi đơn đã " +
        (order.cancelledAt == null ? "hết hạn" : "bị hủy") +
        "; cần đối soát thủ công";
    } else {
      order.status = "PAID";
      if (
        !enrollments.existsByStudentIdAndCourseId(
          order.student.id,
          order.course.id
        )
      ) {
        Enrollment enrollment = new Enrollment();
        enrollment.student = order.student;
        enrollment.course = order.course;
        enrollment.status = "ACTIVE";
        enrollments.save(enrollment);
      }
    }
    orders.save(order);
  }

  private Map<String, Object> view(CourseOrder order) {
    expire(order);
    orders.save(order);
    BigDecimal orig = order.originalAmount != null
      ? order.originalAmount
      : (order.course != null ? order.course.price : order.amount);
    BigDecimal disc = order.discountAmount != null
      ? order.discountAmount
      : BigDecimal.ZERO;
    boolean enrolled =
      order.student != null &&
      order.course != null &&
      enrollments.existsByStudentIdAndCourseId(
        order.student.id,
        order.course.id
      );

    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", order.id);
    view.put("orderId", order.id);
    view.put("free", false);
    view.put("course", order.course);
    view.put(
      "student",
      order.student == null
        ? null
        : Map.of(
            "id",
            order.student.id,
            "name",
            order.student.name == null ? "Học viên" : order.student.name,
            "email",
            order.student.email == null ? "" : order.student.email
          )
    );
    view.put("originalAmount", orig);
    view.put("discountAmount", disc);
    view.put("voucherCode", order.voucherCode);
    view.put("amount", order.amount);
    view.put("paidAmount", order.paidAmount != null ? order.paidAmount : order.amount);
    view.put("status", order.status);
    view.put("paymentCode", order.paymentCode);
    view.put("transactionReference", order.transactionReference);
    view.put("paymentDate", order.paymentDate);
    view.put(
      "paymentTimestampVn",
      order.paymentDate != null
        ? VN_TIME_FMT.format(order.paymentDate)
        : VN_TIME_FMT.format(order.createdAt != null ? order.createdAt : Instant.now())
    );
    view.put("createdAt", order.createdAt);
    view.put("expiresAt", order.expiresAt);
    view.put("cancelledAt", order.cancelledAt);
    view.put("reconciliationNote", order.reconciliationNote);
    view.put("enrollmentStatus", enrolled ? "ACTIVE" : "PENDING");
    view.put("bank", bank);
    view.put("account", account);
    view.put("accountName", accountName);
    view.put("gateway", "PayOS / SE Pay VietQR");
    if ("PENDING".equals(order.status)) {
      view.put("qrUrl", qrUrl(order));
    }
    return view;
  }

  private void expire(CourseOrder order) {
    if (
      "PENDING".equals(order.status) &&
      order.expiresAt != null &&
      !Instant.now().isBefore(order.expiresAt)
    ) order.status = "EXPIRED";
  }

  private String qrUrl(CourseOrder order) {
    String description = URLEncoder.encode(
      order.paymentCode,
      StandardCharsets.UTF_8
    );
    return (
      "https://vietqr.app/img?acc=" +
      account +
      "&bank=" +
      bank +
      "&amount=" +
      order.amount.toBigInteger() +
      "&des=" +
      description +
      "&template=compact&showinfo=true"
    );
  }

  private void ensureConfigured() {
    if (
      account.isBlank() || bank.isBlank()
    ) throw new ResponseStatusException(
      HttpStatus.SERVICE_UNAVAILABLE,
      "SE Pay account is not configured"
    );
  }
}
