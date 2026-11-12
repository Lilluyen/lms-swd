package com.example.lms.controller;

import com.example.lms.dto.*;
import com.example.lms.entity.*;
import com.example.lms.entity.Module;
import com.example.lms.repository.UserRepository;
import com.example.lms.service.*;
import com.example.lms.web.FieldValidationException;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Teacher-facing content API: Course -> Module -> Lesson plus the shared
 * AI content dialog, AI Course Copilot and uploads. Ownership is verified on every call.
 */
@org.springframework.transaction.annotation.Transactional
@RestController
@RequestMapping("/api/teacher")
public class TeacherController {

  private final UserRepository users;
  private final CourseContentService courseContent;
  private final ModuleContentService moduleContent;
  private final LessonContentService lessonContent;
  private final ContentAccessService access;
  private final AiContentService ai;
  private final StorageService storage;

  public TeacherController(
    UserRepository users,
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

  record ReorderRequest(List<Long> ids) {}

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
  Map<String, Object> create(@RequestBody CourseRequest input, HttpSession s) {
    return courseContent.summary(courseContent.create(teacher(s), input));
  }

  @GetMapping("/courses/{id}")
  Map<String, Object> detail(@PathVariable Long id, HttpSession s) {
    return courseContent.detail(access.ownedCourse(id, teacher(s)));
  }

  @PutMapping("/courses/{id}")
  Map<String, Object> update(
    @PathVariable Long id,
    @RequestBody CourseRequest input,
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
    @RequestBody ModuleRequest input,
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
    @RequestBody ModuleRequest input,
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
    @RequestBody ReorderRequest input,
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
    @RequestBody LessonRequest input,
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
    @RequestBody LessonRequest input,
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

  @PostMapping("/ai/chat-course")
  CourseChatResponse chatCourse(
    @RequestBody CourseChatRequest request,
    HttpSession s
  ) {
    return ai.chatCourse(request, teacher(s));
  }

  @PostMapping("/ai/create-course-from-draft")
  Map<String, Object> createCourseFromDraft(
    @RequestBody CourseDraft draft,
    HttpSession s
  ) {
    return ai.createCourseFromDraft(draft, teacher(s));
  }

  @PostMapping("/ai/generate-curriculum")
  CurriculumAiResponse generateCurriculum(
    @RequestBody CurriculumAiRequest request,
    HttpSession s
  ) {
    return ai.generateCurriculum(request, teacher(s));
  }

  @PostMapping("/courses/{id}/apply-curriculum")
  Map<String, Object> applyCurriculum(
    @PathVariable Long id,
    @RequestBody ApplyCurriculumRequest request,
    HttpSession s
  ) {
    return ai.applyCurriculum(id, request, teacher(s));
  }

  @PostMapping("/ai/generate-lessons")
  LessonBatchAiResponse generateLessons(
    @RequestBody LessonBatchAiRequest request,
    HttpSession s
  ) {
    return ai.generateLessonsForModule(request, teacher(s));
  }

  @PostMapping("/modules/{id}/apply-lessons")
  Map<String, Object> applyLessons(
    @PathVariable Long id,
    @RequestBody ApplyLessonsRequest request,
    HttpSession s
  ) {
    return ai.applyLessons(id, request, teacher(s));
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
    if (!kind.equals("thumbnail")) throw new FieldValidationException(
      "file",
      "Loại tệp tải lên không hợp lệ"
    );
    return storage.storeThumbnail(file);
  }
}
