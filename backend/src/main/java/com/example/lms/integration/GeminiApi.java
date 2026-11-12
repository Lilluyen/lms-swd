package com.example.lms.integration;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Low-level Gemini transport (the "GeminiApi" of the class diagrams).
 * Optimized for low latency: HTTP/2 multiplexing, thinkingBudget=0 for instant streaming,
 * dynamic model promotion, and concise generation configs.
 */
@Service
public class GeminiApi {

  private final String key;
  /** Primary model first, then every configured fallback; working model promoted dynamically. */
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
    @Value("${app.gemini.timeout-seconds:35}") long timeoutSeconds
  ) {
    this.key = key == null ? "" : key;
    this.models = Collections.synchronizedList(new ArrayList<>(resolveModels(model, fallbackModels)));
    this.baseUrl = baseUrl.endsWith("/")
      ? baseUrl.substring(0, baseUrl.length() - 1)
      : baseUrl;

    HttpClient httpClient = HttpClient.newBuilder()
      .version(HttpClient.Version.HTTP_2)
      .connectTimeout(Duration.ofSeconds(6))
      .build();

    this.client = RestClient.builder()
      .requestFactory(
        new JdkClientHttpRequestFactory(httpClient) {
          {
            setReadTimeout(Duration.ofSeconds(timeoutSeconds));
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
   * tried in order. Once a candidate succeeds, it is promoted to index 0 so future
   * calls skip any non-working or slower models.
   */
  public Map<?, ?> post(String prompt, int maxOutputTokens) {
    RuntimeException lastFailure = null;
    Map<?, ?> lastEmpty = null;

    List<String> currentCandidates;
    synchronized (models) {
      currentCandidates = new ArrayList<>(models);
    }

    for (int i = 0; i < currentCandidates.size(); i++) {
      String candidate = currentCandidates.get(i);
      try {
        Map<?, ?> raw = send(candidate, prompt, maxOutputTokens);
        if (hasText(raw)) {
          if (i > 0) {
            promoteModel(candidate);
          }
          return raw;
        }
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

  private synchronized void promoteModel(String candidate) {
    synchronized (models) {
      if (models.remove(candidate)) {
        models.add(0, candidate);
      }
    }
  }

  private Map<?, ?> send(String candidate, String prompt, int maxOutputTokens) {
    Map<String, Object> genConfig = new LinkedHashMap<>();
    genConfig.put("temperature", 0.3);
    genConfig.put("maxOutputTokens", maxOutputTokens);

    // Disable internal thinking overhead on Flash / 2.0+ models to eliminate 5-15s thinking delay
    if (candidate.contains("flash") || candidate.contains("2.5") || candidate.contains("2.0") || candidate.contains("3.")) {
      genConfig.put("thinkingConfig", Map.of("thinkingBudget", 0));
    }

    try {
      return executeSend(candidate, prompt, genConfig);
    } catch (RestClientResponseException e) {
      // If the model rejects thinkingConfig with 400 Bad Request, seamlessly retry without it
      if (e.getStatusCode().value() == 400 && genConfig.containsKey("thinkingConfig")) {
        genConfig.remove("thinkingConfig");
        return executeSend(candidate, prompt, genConfig);
      }
      throw e;
    }
  }

  private Map<?, ?> executeSend(String candidate, String prompt, Map<String, Object> genConfig) {
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
          genConfig
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
