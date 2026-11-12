package com.example.lms.service;

import com.example.lms.dto.CourseRequest;
import com.example.lms.entity.Course;
import com.example.lms.entity.Module;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseOrderRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.CourseReviewRepository;
import com.example.lms.repository.EnrollmentRepository;
import com.example.lms.repository.LearningProgressRepository;
import com.example.lms.repository.LessonRepository;
import com.example.lms.repository.ModuleRepository;
import com.example.lms.repository.WishlistRepository;
import com.example.lms.web.FieldValidationException;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Course part of the teacher content feature: search, CRUD and safe delete. */
@Service
@Transactional
public class CourseContentService {

  private final CourseRepository courses;
  private final ModuleRepository modules;
  private final LessonRepository lessons;
  private final EnrollmentRepository enrollments;
  private final CourseOrderRepository orders;
  private final LearningProgressRepository progresses;
  private final CourseReviewRepository reviews;
  private final WishlistRepository wishlists;
  private final ModuleContentService moduleContent;
  private final LessonContentService lessonContent;

  public CourseContentService(
    CourseRepository courses,
    ModuleRepository modules,
    LessonRepository lessons,
    EnrollmentRepository enrollments,
    CourseOrderRepository orders,
    LearningProgressRepository progresses,
    CourseReviewRepository reviews,
    WishlistRepository wishlists,
    ModuleContentService moduleContent,
    LessonContentService lessonContent
  ) {
    this.courses = courses;
    this.modules = modules;
    this.lessons = lessons;
    this.enrollments = enrollments;
    this.orders = orders;
    this.progresses = progresses;
    this.reviews = reviews;
    this.wishlists = wishlists;
    this.moduleContent = moduleContent;
    this.lessonContent = lessonContent;
  }

  public Map<String, Object> search(
    User teacher,
    String q,
    String status,
    int page,
    int size
  ) {
    String keyword = ContentValidator.trim(q).toLowerCase();
    if (keyword.length() > 100) throw new FieldValidationException(
      "q",
      "Từ khóa tìm kiếm tối đa 100 ký tự"
    );
    Boolean published = null;
    if (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) {
      String s = status.toUpperCase();
      if (!ContentValidator.STATUSES.contains(s)) throw new FieldValidationException(
        "status",
        "Trạng thái không hợp lệ"
      );
      published = s.equals("PUBLISHED");
    }
    Boolean publishedFilter = published;
    Specification<Course> spec = (root, query, cb) -> {
      List<Predicate> ps = new ArrayList<>();
      ps.add(cb.equal(root.get("teacher").get("id"), teacher.id));
      if (!keyword.isEmpty()) ps.add(
        cb.like(cb.lower(root.get("title")), "%" + keyword + "%")
      );
      if (publishedFilter != null) ps.add(
        cb.equal(root.get("published"), publishedFilter)
      );
      return cb.and(ps.toArray(new Predicate[0]));
    };
    int safeSize = size < 1 || size > 50 ? 10 : size;
    Pageable pageable = PageRequest.of(
      Math.max(0, page),
      safeSize,
      Sort.by(Sort.Direction.DESC, "updatedAt").and(
        Sort.by(Sort.Direction.DESC, "id")
      )
    );
    Page<Course> found = courses.findAll(spec, pageable);
    List<Map<String, Object>> items = found
      .getContent()
      .stream()
      .map(this::summary)
      .toList();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("items", items);
    out.put("page", found.getNumber());
    out.put("size", found.getSize());
    out.put("total", found.getTotalElements());
    out.put("totalPages", found.getTotalPages());
    return out;
  }

  public Map<String, Object> summary(Course c) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", c.id);
    m.put("title", c.title);
    m.put("description", c.description);
    m.put("category", c.category);
    m.put("context", c.context);
    m.put("level", c.level);
    m.put("price", c.price);
    m.put("cover", c.cover);
    m.put("status", c.published ? "PUBLISHED" : "DRAFT");
    m.put("published", c.published);
    m.put("updatedAt", c.updatedAt == null ? null : c.updatedAt.toString());
    m.put("moduleCount", modules.countByCourseId(c.id));
    m.put("lessonCount", lessons.countByCourseId(c.id));
    var courseReviews = reviews.findByCourseIdOrderByUpdatedAtDesc(c.id);
    m.put("reviewCount", courseReviews.size());
    m.put(
      "rating",
      courseReviews.isEmpty()
        ? null
        : courseReviews
            .stream()
            .mapToInt(review -> review.rating)
            .average()
            .orElse(0)
    );
    return m;
  }

  public Map<String, Object> detail(Course c) {
    Map<String, Object> m = summary(c);
    List<Map<String, Object>> content = new ArrayList<>();
    for (Module module : modules.findByCourseIdOrderByPosition(c.id)) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("module", moduleContent.moduleView(module));
      item.put("lessons", lessonContent.lessonViews(module.id));
      content.add(item);
    }
    m.put("content", content);
    return m;
  }

  public Course create(User teacher, CourseRequest input) {
    CourseRequest clean = ContentValidator.validateCourse(input);
    Course c = new Course();
    c.teacher = teacher;
    apply(c, clean);
    c.updatedAt = Instant.now();
    return courses.save(c);
  }

  public Course update(Course c, CourseRequest input) {
    CourseRequest clean = ContentValidator.validateCourse(input);
    apply(c, clean);
    c.updatedAt = Instant.now();
    return courses.save(c);
  }

  private void apply(Course c, CourseRequest clean) {
    c.title = clean.title();
    c.description = clean.description();
    c.level = clean.level();
    c.price = clean.price();
    c.cover = clean.cover();
    c.category = clean.category();
    c.context = clean.context();
    c.published = "PUBLISHED".equals(clean.status());
  }

  public void delete(Course c) {
    long enrolled = enrollments.countByCourseId(c.id);
    long paid = orders.countByCourseIdAndStatus(c.id, "PAID");
    if (enrolled > 0 || paid > 0) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "Không thể xóa: khóa học đã có " +
          Math.max(enrolled, paid) +
          " học viên ghi danh hoặc giao dịch đã thanh toán. Hãy chuyển khóa học về Draft thay vì xóa."
      );
    }
    progresses.deleteByCourseId(c.id);
    reviews.deleteByCourseId(c.id);
    wishlists.deleteByCourseId(c.id);
    orders.findByCourseId(c.id).forEach(orders::delete);
    for (Module m : modules.findByCourseIdOrderByPosition(c.id)) {
      lessonContent.deleteLessonsOfModule(m.id);
      modules.delete(m);
    }
    courses.delete(c);
  }
}
