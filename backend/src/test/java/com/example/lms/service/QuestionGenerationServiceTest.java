package com.example.lms.service;

import static org.junit.jupiter.api.Assertions.*;

import com.example.lms.dto.QuestionGenerationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class QuestionGenerationServiceTest {
  private final QuestionGenerationService generation = new QuestionGenerationService(null, null);
  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void acceptsSourceQuotesWhenGeminiOmitsMarkdownFormatting() throws Exception {
    String context = """
      **Constructor Injection:** Dependency được truyền vào thông qua constructor khi đối tượng được khởi tạo.
      - `@Service`: Đánh dấu class thuộc tầng xử lý nghiệp vụ.
      **Field Injection:** Dependency được gán trực tiếp vào thuộc tính, thường thông qua annotation `@Autowired` trong Spring.
      """;
    var prepared = prepare(context, 3);
    var quotes = List.of(
      "Constructor Injection: Dependency được truyền vào thông qua constructor khi đối tượng được khởi tạo.",
      "- @Service: Đánh dấu class thuộc tầng xử lý nghiệp vụ.",
      "Field Injection: Dependency được gán trực tiếp vào thuộc tính, thường thông qua annotation `@Autowired` trong Spring."
    );
    String raw = mapper.writeValueAsString(quotes.stream().map(this::draft).toList());

    var drafts = generation.parseDrafts(prepared, raw);

    assertEquals(3, drafts.size());
    assertEquals(quotes, drafts.stream().map(q -> q.get("contextReference")).toList());
    assertEquals(context.trim(), prepared.reference());
    assertTrue(prepared.prompt().contains(context.trim()));
    assertEquals("System Design", drafts.get(0).get("subject"));
    assertNotNull(drafts.get(0).get("draftId"));
  }

  @ParameterizedTest
  @MethodSource("matchingQuotes")
  void acceptsExactQuotesAndPresentationDifferences(String source, String quote) throws Exception {
    var drafts = generation.parseDrafts(prepare(source, 1), mapper.writeValueAsString(List.of(draft(quote))));
    assertEquals(quote, drafts.get(0).get("contextReference"));
  }

  static Stream<Arguments> matchingQuotes() {
    return Stream.of(
      Arguments.of("__Testability:__ Có thể truyền mock dependency.", "Testability: Có thể truyền mock dependency."),
      Arguments.of("DI hỗ trợ `QuestionService` và `QuestionRepository`.", "DI hỗ trợ QuestionService và QuestionRepository."),
      Arguments.of("Dependency Injection là một cách triển khai nguyên lý IoC.", "Dependency Injection là một cách triển khai nguyên lý IoC."),
      Arguments.of("Spring\n  injects dependencies.", "SPRING injects dependencies."),
      Arguments.of("```java\nprivate final OrderRepository repository;\n```", "private final OrderRepository repository;")
    );
  }

  @ParameterizedTest
  @MethodSource("mismatchedQuotes")
  void stillRejectsChangedFactsAndCode(String source, String quote) throws Exception {
    var error = assertThrows(ResponseStatusException.class, () -> generation.parseDrafts(
      prepare(source, 1), mapper.writeValueAsString(List.of(draft(quote)))
    ));
    assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
    assertTrue(error.getReason().contains("Trích dẫn nguồn của câu hỏi số 1 không khớp"));
  }

  static Stream<Arguments> mismatchedQuotes() {
    return Stream.of(
      Arguments.of("**DI:** Không cần sử dụng database thật.", "DI: Cần sử dụng database thật."),
      Arguments.of("Kết quả là `a * b`.", "Kết quả là a + b."),
      Arguments.of("Kết quả là `a**b**c`.", "Kết quả là abc."),
      Arguments.of("Trường dữ liệu là `user_id`.", "Trường dữ liệu là userid."),
      Arguments.of("Trường dữ liệu là `foo__bar__baz`.", "Trường dữ liệu là foobarbaz."),
      Arguments.of("Dependency Injection truyền dependency từ bên ngoài.", "Spring luôn tự tạo repository với new."),
      Arguments.of("Nội dung bài học hợp lệ.", "``````")
    );
  }

  @Test
  void distinguishesMalformedJsonWrongQuantityAndInvalidDraftFields() throws Exception {
    assertError("not JSON", "sai định dạng JSON");
    assertError("{}", "sai định dạng JSON");
    assertError("[1]", "sai định dạng JSON");
    assertError("[]", "0 câu hỏi, trong khi yêu cầu 1 câu");
    assertError("null", "chưa trả về danh sách câu hỏi");
    assertError("[null]", "không đúng cấu trúc");
    for (var entry : Map.of(
      "content", "thiếu nội dung",
      "explanation", "thiếu giải thích",
      "contextReference", "Trích dẫn nguồn",
      "answers", "phải có từ 2 đến 6 đáp án"
    ).entrySet()) {
      var draft = new java.util.HashMap<>(draft("Spring injects dependencies."));
      draft.remove(entry.getKey());
      assertError(mapper.writeValueAsString(List.of(draft)), entry.getValue());
    }
    var draft = new java.util.HashMap<>(draft("Spring injects dependencies."));
    draft.put("answers", List.of(Map.of("content", "A", "correct", true), Map.of("content", "B", "correct", true)));
    assertError(mapper.writeValueAsString(List.of(draft)), "phải có đúng một đáp án đúng");
  }

  private void assertError(String raw, String reason) {
    var error = assertThrows(ResponseStatusException.class,
      () -> generation.parseDrafts(prepare("Spring injects dependencies.", 1), raw));
    assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
    assertTrue(error.getReason().contains(reason), error.getReason());
    assertFalse(error.getReason().contains("bổ sung ngữ cảnh"));
  }

  private QuestionGenerationService.PreparedGeneration prepare(String context, int quantity) {
    return generation.prepare(new QuestionGenerationRequest("System Design", "Dependency Injection (DI)",
      "MEDIUM", quantity, "MULTIPLE_CHOICE", "", "VIETNAMESE", context, null), null);
  }

  private Map<String, Object> draft(String quote) {
    return Map.of("content", "Dependency được cung cấp như thế nào?", "explanation", "Nhận từ bên ngoài.",
      "contextReference", quote, "answers", List.of(
        Map.of("content", "Qua constructor", "correct", true),
        Map.of("content", "Tự khởi tạo", "correct", false)
      ));
  }
}
