package com.example.lms.repository;

import com.example.lms.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LessonRepo extends JpaRepository<Lesson, Long> {
  java.util.List<Lesson> findByModuleIdOrderByPosition(Long moduleId);

  long countByModuleId(Long moduleId);

  @Query("select count(l) from Lesson l where l.module.course.id = :courseId")
  long countByCourseId(@Param("courseId") Long courseId);

  java.util.Optional<Lesson> findFirstByModuleIdOrderByPositionDesc(Long moduleId);
}
