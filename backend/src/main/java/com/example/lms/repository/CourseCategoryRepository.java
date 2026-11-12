package com.example.lms.repository;

import com.example.lms.entity.CourseCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseCategoryRepository
  extends JpaRepository<CourseCategory, Long> {}
