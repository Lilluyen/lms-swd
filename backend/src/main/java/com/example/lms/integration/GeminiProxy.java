package com.example.lms.integration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Gemini-facing use cases (the "GeminiProxy" of the class diagrams): builds the
 * prompt for each feature, validates the model output and maps failures to API
 * statuses. The HTTP transport lives in {@link GeminiApi}.
 */
@Service
public class GeminiProxy {

  private final GeminiApi api;

  public GeminiProxy(GeminiApi api) {
    this.api = api;
  }

  public List<Map<String, Object>> generateParsed(
    String subject,
    String topic,
    String difficulty,
    int quantity
  ) {
    try {
      Map<?, ?> raw = (Map<?, ?>) generate(
        subject,
        topic,
        difficulty,
        quantity
      );
      String text = GeminiApi.extractText(raw);
      if (text == null) throw new IllegalArgumentException();
      text = text.replaceAll("(?s)^```(?:json)?\\s*|```\\s*$", "");
      List<Map<String, Object>> drafts = new ObjectMapper().readValue(
        text,
        new TypeReference<List<Map<String, Object>>>() {}
      );
      if (drafts.isEmpty() || drafts.size() > 10)
        throw new IllegalArgumentException();
      for (Map<String, Object> d : drafts) {
        if (
          !(d.get("content") instanceof String contentText) ||
          contentText.isBlank()
        ) throw new IllegalArgumentException();
        if (
          !(d.get("answers") instanceof List<?> choices) ||
          choices.size() < 2 ||
          choices.size() > 6
        ) throw new IllegalArgumentException();
        int correct = 0;
        for (Object item : choices) {
          if (
            !(item instanceof Map<?, ?> a) ||
            !(a.get("content") instanceof String answerText) ||
            answerText.isBlank()
          ) throw new IllegalArgumentException();
          if (Boolean.TRUE.equals(a.get("correct"))) correct++;
        }
        if (correct != 1) throw new IllegalArgumentException();
        d.put("subject", subject);
        d.put("difficulty", difficulty);
      }
      return drafts;
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_GATEWAY,
        "Gemini returned an invalid question draft"
      );
    }
  }

  public Object generate(
    String subject,
    String topic,
    String difficulty,
    int quantity
  ) {
    if (!api.configured()) throw new ResponseStatusException(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Gemini is not configured"
    );
    String prompt =
      "Generate " +
      quantity +
      " multiple-choice practice questions about " +
      topic +
      " in " +
      subject +
      " at " +
      difficulty +
      " level. Return only a JSON array of objects with subject, content, difficulty, explanation, answers (array of objects content, correct). Exactly four answers and one correct per question.";
    try {
      return api.post(prompt, 2048);
    } catch (Exception e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_GATEWAY,
        "Gemini generation failed"
      );
    }
  }

  /** Gemini answered with an empty string; only this case is worth retrying. */
  public static class EmptyAnswerException extends ResponseStatusException {

    public EmptyAnswerException() {
      super(
        HttpStatus.BAD_GATEWAY,
        "Gemini trả về nội dung rỗng. Vui lòng thử tạo lại."
      );
    }
  }

  /**
   * Sends a ready-made prompt to Gemini and returns the plain text answer.
   * Every failure mode is mapped to a status the UI can explain.
   */
  public String generateText(String prompt, int maxOutputTokens) {
    if (!api.configured()) throw new ResponseStatusException(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Chức năng AI chưa được cấu hình: thiếu GEMINI_API_KEY ở backend."
    );
    try {
      String text = GeminiApi.extractText(api.post(prompt, maxOutputTokens));
      if (text == null || text.isBlank()) throw new EmptyAnswerException();
      return text;
    } catch (ResponseStatusException e) {
      throw e;
    } catch (org.springframework.web.client.ResourceAccessException e) {
      throw new ResponseStatusException(
        HttpStatus.GATEWAY_TIMEOUT,
        "Gemini không phản hồi kịp. Vui lòng thử tạo lại."
      );
    } catch (Exception e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_GATEWAY,
        "Gemini trả về lỗi hoặc nội dung rỗng. Vui lòng thử tạo lại."
      );
    }
  }

  public String generateContent(String topic, String kind) {
    if (!api.configured()) throw new ResponseStatusException(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Chưa cấu hình GEMINI_API_KEY"
    );
    try {
      String prompt =
        "Viết " +
        ("course".equals(kind)
          ? "mô tả khóa học dưới 1800 ký tự"
          : "nội dung bài học dưới 9000 ký tự") +
        " bằng tiếng Việt về: " +
        topic +
        ". Trả về văn bản thuần, không HTML.";
      int tokens = "course".equals(kind) ? 1200 : 3500;
      String text = GeminiApi.extractText(api.post(prompt, tokens));
      if (text == null || text.isBlank()) throw new IllegalStateException();
      return text;
    } catch (Exception e) {
      throw new ResponseStatusException(
        HttpStatus.BAD_GATEWAY,
        "Không thể tạo nội dung. Hãy thử lại."
      );
    }
  }
}
