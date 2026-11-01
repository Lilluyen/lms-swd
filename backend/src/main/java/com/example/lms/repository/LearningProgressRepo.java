package com.example.lms.repository;

import com.example.lms.entity.LearningProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LearningProgressRepo
  extends JpaRepository<LearningProgress, Long> {
  @Modifying
  @Query("delete from LearningProgress p where p.lesson.id = :lessonId")
  void deleteByLessonId(@Param("lessonId") Long lessonId);

  @Modifying
  @Query(
    "delete from LearningProgress p where p.enrollment.course.id = :courseId"
  )
  void deleteByCourseId(@Param("courseId") Long courseId);
}
