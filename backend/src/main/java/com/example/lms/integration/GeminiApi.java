package com.example.lms.integration;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Low-level Gemini transport (the "GeminiApi" of the class diagrams).
 * Knows the endpoint, the API key and the response shape; business prompts and
 * validation stay in the feature services / {@link Integrations}.
 */
@Service
public class GeminiApi {

  private final String key;
  private final String model;
  private final String baseUrl;
  private final RestClient client;

  public GeminiApi(
    @Value("${app.gemini.key}") String key,
    @Value("${app.gemini.model}") String model,
    @Value(
      "${app.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}"
    ) String baseUrl,
    @Value("${app.gemini.timeout-seconds:45}") long timeoutSeconds
  ) {
    this.key = key == null ? "" : key;
    this.model = model;
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

  /** Sends one user prompt and returns the decoded JSON response. */
  public Map<?, ?> post(String prompt, int maxOutputTokens) {
    return client
      .post()
      .uri(baseUrl + "/models/" + model + ":generateContent")
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
