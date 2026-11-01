package com.example.lms.repository;

import com.example.lms.entity.LearningMaterial;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningMaterialRepo
  extends JpaRepository<LearningMaterial, Long> {
  java.util.List<LearningMaterial> findByLessonId(Long lessonId);
}
