package com.example.lms.service;

import com.example.lms.dto.ModuleInput;
import com.example.lms.entity.Course;
import com.example.lms.entity.Module;
import com.example.lms.repository.LessonRepo;
import com.example.lms.repository.ModuleRepo;
import com.example.lms.web.FieldErrors;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Module (chapter) part of the teacher content feature. */
@Service
@Transactional
public class ModuleContentService {

  private final ModuleRepo modules;
  private final LessonRepo lessons;
  private final LessonContentService lessonContent;

  public ModuleContentService(
    ModuleRepo modules,
    LessonRepo lessons,
    LessonContentService lessonContent
  ) {
    this.modules = modules;
    this.lessons = lessons;
    this.lessonContent = lessonContent;
  }

  public Map<String, Object> moduleView(Module m) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", m.id);
    view.put("title", m.title);
    view.put("description", m.description);
    view.put("position", m.position);
    view.put("courseId", m.course.id);
    view.put("lessonCount", lessons.countByModuleId(m.id));
    return view;
  }

  public List<Map<String, Object>> moduleList(Course c) {
    return modules
      .findByCourseIdOrderByPosition(c.id)
      .stream()
      .map(this::moduleView)
      .toList();
  }

  public Module addModule(Course c, ModuleInput input) {
    ModuleInput clean = ContentValidation.validateModule(input);
    Module m = new Module();
    m.course = c;
    m.title = clean.title();
    m.description = clean.description();
    m.position = (int) modules.countByCourseId(c.id) + 1;
    return modules.save(m);
  }

  public Module updateModule(Module m, ModuleInput input) {
    ModuleInput clean = ContentValidation.validateModule(input);
    m.title = clean.title();
    m.description = clean.description();
    return modules.save(m);
  }

  public void deleteModule(Module m) {
    lessonContent.deleteLessonsOfModule(m.id);
    Long courseId = m.course.id;
    modules.delete(m);
    normalizeModules(courseId);
  }

  /** Persists the order produced by drag & drop. */
  public List<Map<String, Object>> reorderModules(Course c, List<Long> ids) {
    List<Module> current = modules.findByCourseIdOrderByPosition(c.id);
    List<Long> existing = current.stream().map(m -> m.id).toList();
    if (
      ids == null ||
      ids.size() != existing.size() ||
      new HashSet<>(ids).size() != ids.size() ||
      !new HashSet<>(ids).equals(new HashSet<>(existing))
    ) throw new FieldErrors(
      "order",
      "Danh sách thứ tự module không khớp với khóa học"
    );
    for (int i = 0; i < ids.size(); i++) {
      Long wanted = ids.get(i);
      Module m = current
        .stream()
        .filter(x -> x.id.equals(wanted))
        .findFirst()
        .orElseThrow();
      m.position = i + 1;
      modules.save(m);
    }
    return moduleList(c);
  }

  private void normalizeModules(Long courseId) {
    List<Module> list = modules.findByCourseIdOrderByPosition(courseId);
    for (int i = 0; i < list.size(); i++) {
      if (list.get(i).position != i + 1) {
        list.get(i).position = i + 1;
        modules.save(list.get(i));
      }
    }
  }
}
