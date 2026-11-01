package com.example.lms.service;

import com.example.lms.dto.CourseInput;
import com.example.lms.dto.LessonInput;
import com.example.lms.dto.ModuleInput;
import com.example.lms.web.FieldErrors;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Validation rules for teacher content (course / module / lesson).
 * Kept free of persistence so the same rules can be reused by any service.
 */
public final class ContentValidation {

  public static final List<String> LEVELS = List.of(
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED"
  );
  public static final List<String> STATUSES = List.of("DRAFT", "PUBLISHED");
  public static final List<String> CONTENT_TYPES = List.of(
    "TEXT",
    "VIDEO",
    "FILE"
  );

  private ContentValidation() {}

  static String trim(String value) {
    return value == null ? "" : value.trim();
  }

  static int length(String value) {
    return trim(value).length();
  }

  public static CourseInput validateCourse(CourseInput in) {
    Map<String, String> e = new LinkedHashMap<>();
    String title = trim(in.title());
    String description = trim(in.description());
    if (length(title) < 5 || length(title) > 100) e.put(
      "title",
      "Tên khóa học phải từ 5 đến 100 ký tự"
    );
    if (length(description) < 10 || length(description) > 2000) e.put(
      "description",
      "Mô tả phải từ 10 đến 2.000 ký tự"
    );
    String level = in.level() == null ? "BEGINNER" : in.level().toUpperCase();
    if (!LEVELS.contains(level)) e.put("level", "Cấp độ không hợp lệ");
    String status = in.status() == null ? "DRAFT" : in.status().toUpperCase();
    if (!STATUSES.contains(status)) e.put("status", "Trạng thái không hợp lệ");
    BigDecimal price = in.price() == null ? BigDecimal.ZERO : in.price();
    if (
      price.signum() < 0 || price.compareTo(new BigDecimal("100000000")) > 0
    ) e.put("price", "Giá phải từ 0 đến 100.000.000 ₫");
    String cover = trim(in.cover());
    if (cover.length() > 500) e.put("cover", "Đường dẫn ảnh quá dài");
    String context = trim(in.context());
    if (context.length() > 2000) e.put(
      "context",
      "Bối cảnh khóa học tối đa 2.000 ký tự"
    );
    if (!e.isEmpty()) throw new FieldErrors(e);
    return new CourseInput(
      title,
      description,
      level,
      price,
      cover.isEmpty() ? null : cover,
      status,
      trim(in.category()),
      context.isEmpty() ? null : context
    );
  }

  public static ModuleInput validateModule(ModuleInput in) {
    Map<String, String> e = new LinkedHashMap<>();
    String title = trim(in.title());
    String description = trim(in.description());
    if (length(title) < 3 || length(title) > 100) e.put(
      "title",
      "Tên module phải từ 3 đến 100 ký tự"
    );
    if (length(description) > 500) e.put(
      "description",
      "Mô tả module tối đa 500 ký tự"
    );
    if (!e.isEmpty()) throw new FieldErrors(e);
    return new ModuleInput(title, description.isEmpty() ? null : description);
  }

  public static LessonInput validateLesson(LessonInput in) {
    Map<String, String> e = new LinkedHashMap<>();
    String title = trim(in.title());
    String type = in.contentType() == null
      ? "TEXT"
      : in.contentType().toUpperCase();
    if (length(title) < 3 || length(title) > 150) e.put(
      "title",
      "Tiêu đề bài học phải từ 3 đến 150 ký tự"
    );
    if (!CONTENT_TYPES.contains(type)) e.put(
      "contentType",
      "Loại nội dung không hợp lệ"
    );
    if (
      in.durationMinutes() != null &&
      (in.durationMinutes() < 1 || in.durationMinutes() > 600)
    ) e.put("durationMinutes", "Thời lượng phải từ 1 đến 600 phút");
    if (in.position() != null && in.position() < 1) e.put(
      "position",
      "Thứ tự phải là số nguyên từ 1"
    );
    String content = trim(in.content());
    String videoUrl = trim(in.videoUrl());
    if (
      type.equals("TEXT") && (length(content) < 10 || length(content) > 10000)
    ) e.put("content", "Nội dung bài học phải từ 10 đến 10.000 ký tự");
    if (type.equals("VIDEO")) {
      if (videoUrl.isEmpty()) e.put("videoUrl", "Vui lòng nhập URL video");
      else if (
        !videoUrl.matches("^https?://\\S+$") || videoUrl.length() > 500
      ) e.put("videoUrl", "URL video không hợp lệ");
    }
    if (!e.isEmpty()) throw new FieldErrors(e);
    return new LessonInput(
      in.moduleId(),
      title,
      type,
      type.equals("TEXT") ? content : null,
      type.equals("VIDEO") ? videoUrl : null,
      in.durationMinutes(),
      in.position(),
      trim(in.fileUrl()).isEmpty() ? null : trim(in.fileUrl()),
      trim(in.fileName()).isEmpty() ? null : trim(in.fileName())
    );
  }
}
