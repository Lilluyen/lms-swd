package com.example.lms.controller;

import com.example.lms.dto.*;
import com.example.lms.entity.*;
import com.example.lms.entity.Module;
import com.example.lms.repository.UserRepo;
import com.example.lms.service.*;
import com.example.lms.web.FieldErrors;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Teacher-facing content API: Course -> Module -> Lesson plus the shared
 * AI content dialog and uploads. Ownership is verified on every call.
 */
@org.springframework.transaction.annotation.Transactional
@RestController
@RequestMapping("/api/teacher")
public class TeacherApi {

  private final UserRepo users;
  private final CourseContentService courseContent;
  private final ModuleContentService moduleContent;
  private final LessonContentService lessonContent;
  private final ContentAccessService access;
  private final AiContentService ai;
  private final StorageService storage;

  public TeacherApi(
    UserRepo users,
    CourseContentService courseContent,
    ModuleContentService moduleContent,
    LessonContentService lessonContent,
    ContentAccessService access,
    AiContentService ai,
    StorageService storage
  ) {
    this.users = users;
    this.courseContent = courseContent;
    this.moduleContent = moduleContent;
    this.lessonContent = lessonContent;
    this.access = access;
    this.ai = ai;
    this.storage = storage;
  }

  User teacher(HttpSession s) {
    Long id = (Long) s.getAttribute("uid");
    if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    User u = users
      .findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    if (!"TEACHER".equals(u.role)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Chỉ giáo viên mới dùng được chức năng này"
    );
    return u;
  }

  record OrderInput(List<Long> ids) {}

  /* ---------------------------------------------------------------- courses */

  @GetMapping("/courses")
  Map<String, Object> list(
    @RequestParam(required = false) String q,
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    HttpSession s
  ) {
    return courseContent.search(teacher(s), q, status, page, size);
  }

  @PostMapping("/courses")
  Map<String, Object> create(@RequestBody CourseInput input, HttpSession s) {
    return courseContent.summary(courseContent.create(teacher(s), input));
  }

  @GetMapping("/courses/{id}")
  Map<String, Object> detail(@PathVariable Long id, HttpSession s) {
    return courseContent.detail(access.ownedCourse(id, teacher(s)));
  }

  @PutMapping("/courses/{id}")
  Map<String, Object> update(
    @PathVariable Long id,
    @RequestBody CourseInput input,
    HttpSession s
  ) {
    return courseContent.summary(
      courseContent.update(access.ownedCourse(id, teacher(s)), input)
    );
  }

  @DeleteMapping("/courses/{id}")
  Map<String, Object> delete(@PathVariable Long id, HttpSession s) {
    courseContent.delete(access.ownedCourse(id, teacher(s)));
    return Map.of("deleted", true);
  }

  /* ---------------------------------------------------------------- modules */

  @GetMapping("/courses/{id}/modules")
  Map<String, Object> modules(@PathVariable Long id, HttpSession s) {
    Course c = access.ownedCourse(id, teacher(s));
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("course", courseContent.summary(c));
    out.put("modules", moduleContent.moduleList(c));
    return out;
  }

  @PostMapping("/courses/{id}/modules")
  Map<String, Object> addModule(
    @PathVariable Long id,
    @RequestBody ModuleInput input,
    HttpSession s
  ) {
    Course c = access.ownedCourse(id, teacher(s));
    Module m = moduleContent.addModule(c, input);
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("module", m);
    out.put("modules", moduleContent.moduleList(c));
    return out;
  }

  @PutMapping("/modules/{id}")
  Map<String, Object> updateModule(
    @PathVariable Long id,
    @RequestBody ModuleInput input,
    HttpSession s
  ) {
    Module m = access.ownedModule(id, teacher(s));
    moduleContent.updateModule(m, input);
    return Map.of("modules", moduleContent.moduleList(m.course));
  }

  @DeleteMapping("/modules/{id}")
  Map<String, Object> deleteModule(@PathVariable Long id, HttpSession s) {
    Module m = access.ownedModule(id, teacher(s));
    Course c = m.course;
    moduleContent.deleteModule(m);
    return Map.of("modules", moduleContent.moduleList(c));
  }

  @PutMapping("/courses/{id}/modules/order")
  Map<String, Object> reorder(
    @PathVariable Long id,
    @RequestBody OrderInput input,
    HttpSession s
  ) {
    Course c = access.ownedCourse(id, teacher(s));
    return Map.of("modules", moduleContent.reorderModules(c, input.ids()));
  }

  /* ---------------------------------------------------------------- lessons */

  @GetMapping("/modules/{id}/lessons")
  Map<String, Object> lessons(@PathVariable Long id, HttpSession s) {
    Module m = access.ownedModule(id, teacher(s));
    Map<String, Object> out = new LinkedHashMap<>();
    out.put(
      "module",
      moduleContent
        .moduleList(m.course)
        .stream()
        .filter(x -> m.id.equals(x.get("id")))
        .findFirst()
        .orElse(Map.of())
    );
    out.put("lessons", lessonContent.lessonViews(m.id));
    return out;
  }

  @PostMapping("/modules/{id}/lessons")
  Map<String, Object> addLesson(
    @PathVariable Long id,
    @RequestBody LessonInput input,
    HttpSession s
  ) {
    Module m = access.ownedModule(id, teacher(s));
    Lesson created = lessonContent.addLesson(m, input);
    List<Map<String, Object>> views = lessonContent.lessonViews(m.id);
    Map<String, Object> out = new LinkedHashMap<>();
    out.put(
      "lesson",
      views
        .stream()
        .filter(x -> created.id.equals(x.get("id")))
        .findFirst()
        .orElse(Map.of())
    );
    out.put("lessons", views);
    return out;
  }

  @PutMapping("/lessons/{id}")
  Map<String, Object> updateLesson(
    @PathVariable Long id,
    @RequestBody LessonInput input,
    HttpSession s
  ) {
    Lesson l = access.ownedLesson(id, teacher(s));
    Long courseId = l.module.course.id;
    lessonContent.updateLesson(l, input);
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("lessons", lessonContent.lessonViews(l.module.id));
    out.put("courseId", courseId);
    return out;
  }

  @DeleteMapping("/lessons/{id}")
  Map<String, Object> deleteLesson(@PathVariable Long id, HttpSession s) {
    Lesson l = access.ownedLesson(id, teacher(s));
    Long moduleId = l.module.id;
    lessonContent.deleteLesson(l);
    return Map.of("lessons", lessonContent.lessonViews(moduleId));
  }

  /* -------------------------------------------------------------------- AI */

  @PostMapping("/ai/generate")
  Map<String, Object> generate(@RequestBody AiRequest request, HttpSession s) {
    return ai.generate(request, teacher(s));
  }

  /* --------------------------------------------------------------- uploads */

  @PostMapping("/uploads")
  Map<String, Object> upload(
    @RequestParam("file") MultipartFile file,
    @RequestParam(defaultValue = "thumbnail") String kind,
    HttpSession s
  ) {
    teacher(s);
    if (kind.equals("lesson-file")) return storage.storeLessonFile(file);
    if (!kind.equals("thumbnail")) throw new FieldErrors(
      "file",
      "Loại tệp tải lên không hợp lệ"
    );
    return storage.storeThumbnail(file);
  }
}
