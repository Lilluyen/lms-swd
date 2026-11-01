package com.example.lms.integration;

import com.example.lms.entity.CourseOrder;
import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Adapter encapsulating PayOS / SE Pay VietQR link generation and webhook verification
 * (matches PayOSClient in Class Diagram 4 - Enroll Course with Payment).
 */
@Component
public class PayOSClient {

  private final String account;
  private final String bank;
  private final String accountName;
  private final String webhookKey;

  public PayOSClient(
    @Value("${app.sepay.account:}") String account,
    @Value("${app.sepay.bank:}") String bank,
    @Value("${app.sepay.account-name:}") String accountName,
    @Value("${app.sepay.webhook-key:}") String webhookKey
  ) {
    this.account = account;
    this.bank = bank;
    this.accountName = accountName;
    this.webhookKey = webhookKey;
  }

  public void ensureConfigured() {
    if (account == null || account.isBlank() || bank == null || bank.isBlank()) {
      throw new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "SE Pay / PayOS account is not configured"
      );
    }
  }

  public String getAccount() {
    return account;
  }

  public String getBank() {
    return bank;
  }

  public String getAccountName() {
    return accountName;
  }

  public String getWebhookKey() {
    return webhookKey;
  }

  public String generateQrUrl(CourseOrder order) {
    String description = URLEncoder.encode(order.paymentCode, StandardCharsets.UTF_8);
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

  public String generateCheckoutUrl(CourseOrder order, String frontendUrl) {
    String base = (frontendUrl == null || frontendUrl.isBlank())
      ? "http://localhost:5173"
      : frontendUrl;
    return base + "/?orderId=" + order.id + "&paymentCode=" + order.paymentCode;
  }

  /**
   * Verifies incoming webhook authentication via either Authorization header ("Apikey <key>")
   * or PayOS HMAC-SHA256 payload signature.
   */
  public boolean verifyWebhookSignature(String authorization, Map<String, Object> payload) {
    if (webhookKey == null || webhookKey.isBlank()) {
      return false;
    }
    if (("Apikey " + webhookKey).equals(authorization)) {
      return true;
    }
    Object sigObj = payload != null ? payload.get("signature") : null;
    if (sigObj != null && !String.valueOf(sigObj).isBlank()) {
      String providedSig = String.valueOf(sigObj);
      String dataStr =
        String.valueOf(payload.getOrDefault("paymentCode", payload.getOrDefault("code", ""))) +
        "|" +
        String.valueOf(payload.getOrDefault("transferAmount", payload.getOrDefault("amount", "")));
      String expectedSig = hmacSha256(dataStr, webhookKey);
      return expectedSig.equalsIgnoreCase(providedSig) || webhookKey.equals(providedSig);
    }
    return false;
  }

  public String hmacSha256(String data, String key) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      SecretKeySpec secretKey = new SecretKeySpec(
        key.getBytes(StandardCharsets.UTF_8),
        "HmacSHA256"
      );
      mac.init(secretKey);
      byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder(rawHmac.length * 2);
      for (byte b : rawHmac) {
        sb.append(String.format("%02x", b));
      }
      return sb.toString();
    } catch (Exception e) {
      return "";
    }
  }
}
