package com.example.lms.service;

import com.example.lms.dto.LessonInput;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.Module;
import com.example.lms.repository.LearningMaterialRepo;
import com.example.lms.repository.LearningProgressRepo;
import com.example.lms.repository.LessonRepo;
import com.example.lms.web.FieldErrors;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lesson part of the teacher content feature: CRUD and 1-based ordering. */
@Service
@Transactional
public class LessonContentService {

  private final LessonRepo lessons;
  private final LearningProgressRepo progresses;
  private final LearningMaterialRepo materials;
  private final ContentAccessService access;

  public LessonContentService(
    LessonRepo lessons,
    LearningProgressRepo progresses,
    LearningMaterialRepo materials,
    ContentAccessService access
  ) {
    this.lessons = lessons;
    this.progresses = progresses;
    this.materials = materials;
    this.access = access;
  }

  public Map<String, Object> lessonView(Lesson l) {
    Map<String, Object> view = new LinkedHashMap<>();
    view.put("id", l.id);
    view.put("title", l.title);
    view.put("contentType", l.contentType);
    view.put("content", l.content);
    view.put("videoUrl", l.videoUrl);
    view.put("durationMinutes", l.durationMinutes);
    view.put("fileUrl", l.fileUrl);
    view.put("fileName", l.fileName);
    view.put("position", l.position);
    view.put("moduleId", l.module.id);
    view.put("courseId", l.module.course.id);
    return view;
  }

  public List<Map<String, Object>> lessonViews(Long moduleId) {
    return lessons
      .findByModuleIdOrderByPosition(moduleId)
      .stream()
      .map(this::lessonView)
      .toList();
  }

  public Lesson addLesson(Module m, LessonInput input) {
    LessonInput clean = ContentValidation.validateLesson(input);
    if (clean.fileUrl() == null && "FILE".equals(clean.contentType()))
      throw new FieldErrors("fileUrl", "Vui lòng tải lên tệp bài học");
    Lesson l = new Lesson();
    l.module = m;
    l.title = clean.title();
    l.contentType = clean.contentType();
    l.content = clean.content();
    l.videoUrl = clean.videoUrl();
    l.durationMinutes = clean.durationMinutes();
    l.fileUrl = clean.fileUrl();
    l.fileName = clean.fileName();
    l.position = (int) lessons.countByModuleId(m.id) + 1;
    lessons.save(l);
    int target = clean.position() == null ? l.position : clean.position();
    moveLesson(l, m, target);
    return l;
  }

  public Lesson updateLesson(Lesson l, LessonInput input) {
    LessonInput clean = ContentValidation.validateLesson(input);
    Module target = l.module;
    if (clean.moduleId() != null && !clean.moduleId().equals(l.module.id)) {
      target = access.ownedModule(clean.moduleId(), l.module.course.teacher);
      if (!target.course.id.equals(l.module.course.id)) throw new FieldErrors(
        "moduleId",
        "Chỉ có thể chuyển bài học trong cùng khóa học"
      );
    }
    if (
      "FILE".equals(clean.contentType()) &&
      clean.fileUrl() == null &&
      l.fileUrl == null
    ) throw new FieldErrors("fileUrl", "Vui lòng tải lên tệp bài học");
    Long previousModule = l.module.id;
    l.title = clean.title();
    l.contentType = clean.contentType();
    l.content = clean.content();
    l.videoUrl = clean.videoUrl();
    l.durationMinutes = clean.durationMinutes();
    if (clean.fileUrl() != null) {
      l.fileUrl = clean.fileUrl();
      l.fileName = clean.fileName();
    }
    if (!"FILE".equals(clean.contentType())) {
      l.fileUrl = null;
      l.fileName = null;
    }
    l.module = target;
    lessons.save(l);
    int targetPosition = clean.position() == null
      ? l.position
      : clean.position();
    moveLesson(l, target, targetPosition);
    if (!previousModule.equals(target.id)) normalizeLessons(previousModule);
    return l;
  }

  public void deleteLesson(Lesson l) {
    Long moduleId = l.module.id;
    deleteLessonRow(l);
    normalizeLessons(moduleId);
  }

  /** Used when a whole module or course is deleted. */
  public void deleteLessonsOfModule(Long moduleId) {
    lessons.findByModuleIdOrderByPosition(moduleId).forEach(this::deleteLessonRow);
  }

  private void deleteLessonRow(Lesson l) {
    progresses.deleteByLessonId(l.id);
    materials.findByLessonId(l.id).forEach(materials::delete);
    lessons.delete(l);
  }

  /** Places the lesson at 1-based target order inside the module. */
  private void moveLesson(Lesson l, Module target, int targetPosition) {
    List<Lesson> list = new ArrayList<>(
      lessons.findByModuleIdOrderByPosition(target.id)
    );
    list.removeIf(x -> x.id.equals(l.id));
    int index = Math.max(0, Math.min(targetPosition - 1, list.size()));
    l.module = target;
    list.add(index, l);
    for (int i = 0; i < list.size(); i++) {
      Lesson item = list.get(i);
      if (item.position != i + 1) {
        item.position = i + 1;
        lessons.save(item);
      }
    }
  }

  private void normalizeLessons(Long moduleId) {
    List<Lesson> list = lessons.findByModuleIdOrderByPosition(moduleId);
    for (int i = 0; i < list.size(); i++) {
      if (list.get(i).position != i + 1) {
        list.get(i).position = i + 1;
        lessons.save(list.get(i));
      }
    }
  }
}
