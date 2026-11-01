package com.example.lms.repository;

import com.example.lms.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModuleRepo extends JpaRepository<Module, Long> {
  java.util.List<Module> findByCourseIdOrderByPosition(Long courseId);
  long countByCourseId(Long courseId);
  java.util.Optional<Module> findFirstByCourseIdOrderByPositionDesc(Long courseId);
}
