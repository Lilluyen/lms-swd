package com.example.lms.repository;

import com.example.lms.entity.QuestionBank;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionBankRepo extends JpaRepository<QuestionBank, Long> {}
