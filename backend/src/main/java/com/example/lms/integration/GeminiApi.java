package com.example.lms.integration;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Low-level Gemini transport (the "GeminiApi" of the class diagrams).
 * Knows the endpoint, the API key and the response shape; business prompts and
 * validation stay in the feature services / {@link Integrations}.
 */
@Service
public class GeminiApi {

  private final String key;
  /** Primary model first, then every configured fallback, without duplicates. */
  private final List<String> models;
  private final String baseUrl;
  private final RestClient client;

  public GeminiApi(
    @Value("${app.gemini.key}") String key,
    @Value("${app.gemini.model}") String model,
    @Value("${app.gemini.fallback-models:}") String fallbackModels,
    @Value(
      "${app.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}"
    ) String baseUrl,
    @Value("${app.gemini.timeout-seconds:45}") long timeoutSeconds
  ) {
    this.key = key == null ? "" : key;
    this.models = resolveModels(model, fallbackModels);
    this.baseUrl = baseUrl.endsWith("/")
      ? baseUrl.substring(0, baseUrl.length() - 1)
      : baseUrl;
    this.client = RestClient.builder()
      .requestFactory(
        new org.springframework.http.client.JdkClientHttpRequestFactory(
          java.net.http.HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(10))
            .build()
        ) {
          {
            setReadTimeout(java.time.Duration.ofSeconds(timeoutSeconds));
          }
        }
      )
      .build();
  }

  public boolean configured() {
    return key != null && !key.isBlank();
  }

  /**
   * Sends one user prompt and returns the decoded JSON response. Models are
   * tried in order: the primary first, then each configured fallback. An empty
   * answer or a model-level failure (unknown model, rate limit, server error)
   * moves on to the next model, while auth and bad-request errors fail fast
   * because another model would fail the same way.
   */
  public Map<?, ?> post(String prompt, int maxOutputTokens) {
    RuntimeException lastFailure = null;
    Map<?, ?> lastEmpty = null;
    for (String candidate : models) {
      try {
        Map<?, ?> raw = send(candidate, prompt, maxOutputTokens);
        if (hasText(raw)) return raw;
        lastEmpty = raw;
        lastFailure = null;
      } catch (RestClientResponseException e) {
        if (!shouldFallback(e.getStatusCode())) throw e;
        lastFailure = e;
      }
    }
    if (lastFailure != null) throw lastFailure;
    return lastEmpty;
  }

  private Map<?, ?> send(String candidate, String prompt, int maxOutputTokens) {
    return client
      .post()
      .uri(baseUrl + "/models/" + candidate + ":generateContent")
      .header("x-goog-api-key", key)
      .contentType(MediaType.APPLICATION_JSON)
      .body(
        Map.of(
          "contents",
          List.of(
            Map.of(
              "role",
              "user",
              "parts",
              List.of(Map.of("text", prompt))
            )
          ),
          "generationConfig",
          Map.of("temperature", 0.7, "maxOutputTokens", maxOutputTokens)
        )
      )
      .retrieve()
      .body(Map.class);
  }

  private static boolean hasText(Map<?, ?> raw) {
    String text = extractText(raw);
    return text != null && !text.isBlank();
  }

  /**
   * Only model-specific failures are worth another model. 400/401/403 mean the
   * request or key is wrong, and timeouts are left to the caller's own retry so
   * one slow model does not multiply the request latency by the model count.
   */
  private static boolean shouldFallback(HttpStatusCode status) {
    int code = status.value();
    return code == 404 || code == 408 || code == 429 ||
    status.is5xxServerError();
  }

  private static List<String> resolveModels(String primary, String fallbacks) {
    LinkedHashSet<String> resolved = new LinkedHashSet<>();
    if (primary != null && !primary.isBlank()) resolved.add(primary.trim());
    if (fallbacks != null) {
      for (String candidate : fallbacks.split(",")) {
        String value = candidate.trim();
        if (!value.isEmpty()) resolved.add(value);
      }
    }
    if (resolved.isEmpty()) throw new IllegalStateException(
      "app.gemini.model phải được cấu hình"
    );
    return new ArrayList<>(resolved);
  }

  @SuppressWarnings("unchecked")
  public static String extractText(Map<?, ?> raw) {
    if (raw == null) return null;
    Object candidates = raw.get("candidates");
    if (!(candidates instanceof List<?> list) || list.isEmpty()) return null;
    Object content = ((Map<?, ?>) list.get(0)).get("content");
    if (!(content instanceof Map<?, ?> map)) return null;
    Object parts = map.get("parts");
    if (!(parts instanceof List<?> partList) || partList.isEmpty()) return null;
    StringBuilder sb = new StringBuilder();
    for (Object part : partList) {
      if (part instanceof Map<?, ?> p && p.get("text") instanceof String t) {
        sb.append(t);
      }
    }
    return sb.length() == 0 ? null : sb.toString();
  }
}
