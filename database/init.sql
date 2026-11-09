-- Learnova LMS / MySQL 8.4. Applied when Docker initializes an empty volume.
CREATE DATABASE IF NOT EXISTS learnova_compact CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE learnova_compact;

CREATE TABLE IF NOT EXISTS `users` (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(255) NOT NULL DEFAULT 'STUDENT',
  provider VARCHAR(255) NOT NULL DEFAULT 'LOCAL',
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255),
  description VARCHAR(5000),
  category VARCHAR(255),
  price DECIMAL(38,2) NOT NULL DEFAULT 0,
  cover VARCHAR(500),
  `context` VARCHAR(2000) NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at DATETIME(6) NULL,
  teacher_id BIGINT,
  PRIMARY KEY (id),
  KEY idx_course_teacher (teacher_id),
  CONSTRAINT fk_course_teacher FOREIGN KEY (teacher_id) REFERENCES `users` (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `modules` (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255),
  description VARCHAR(500),
  position INT NOT NULL DEFAULT 0,
  course_id BIGINT,
  PRIMARY KEY (id),
  KEY idx_module_course (course_id),
  CONSTRAINT fk_module_course FOREIGN KEY (course_id) REFERENCES courses (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lessons (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255),
  content_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
  content VARCHAR(10000),
  video_url VARCHAR(255),
  duration_minutes INT NULL,
  file_url VARCHAR(500) NULL,
  file_name VARCHAR(255) NULL,
  position INT NOT NULL DEFAULT 0,
  module_id BIGINT,
  PRIMARY KEY (id),
  KEY idx_lesson_module (module_id),
  CONSTRAINT fk_lesson_module FOREIGN KEY (module_id) REFERENCES `modules` (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  subject VARCHAR(255),
  content VARCHAR(3000),
  difficulty VARCHAR(255),
  explanation VARCHAR(3000),
  teacher_id BIGINT,
  PRIMARY KEY (id),
  KEY idx_question_teacher_subject (teacher_id, subject),
  CONSTRAINT fk_question_teacher FOREIGN KEY (teacher_id) REFERENCES `users` (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS answers (
  id BIGINT NOT NULL AUTO_INCREMENT,
  content VARCHAR(255),
  correct BOOLEAN NOT NULL DEFAULT FALSE,
  question_id BIGINT,
  PRIMARY KEY (id),
  KEY idx_answer_question (question_id),
  CONSTRAINT fk_answer_question FOREIGN KEY (question_id) REFERENCES questions (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quizzes (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255),
  subject VARCHAR(255),
  duration_minutes INT NOT NULL DEFAULT 20,
  owner_id BIGINT,
  PRIMARY KEY (id),
  KEY idx_quiz_owner (owner_id),
  CONSTRAINT fk_quiz_owner FOREIGN KEY (owner_id) REFERENCES `users` (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  quiz_id BIGINT,
  question_id BIGINT,
  position INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_quiz_question_quiz (quiz_id),
  KEY idx_quiz_question_question (question_id),
  CONSTRAINT fk_quiz_question_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id),
  CONSTRAINT fk_quiz_question_question FOREIGN KEY (question_id) REFERENCES questions (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  quiz_id BIGINT,
  student_id BIGINT,
  score INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  completed_at DATETIME(6),
  PRIMARY KEY (id),
  KEY idx_result_student (student_id),
  KEY idx_result_quiz (quiz_id),
  CONSTRAINT fk_result_student FOREIGN KEY (student_id) REFERENCES `users` (id),
  CONSTRAINT fk_result_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
  id BIGINT NOT NULL AUTO_INCREMENT,
  result_id BIGINT,
  question_id BIGINT,
  selected_id BIGINT,
  PRIMARY KEY (id),
  KEY idx_quiz_answer_result (result_id),
  KEY idx_quiz_answer_question (question_id),
  KEY idx_quiz_answer_selected (selected_id),
  CONSTRAINT fk_quiz_answer_result FOREIGN KEY (result_id) REFERENCES quiz_attempts (id),
  CONSTRAINT fk_quiz_answer_question FOREIGN KEY (question_id) REFERENCES questions (id),
  CONSTRAINT fk_quiz_answer_selected FOREIGN KEY (selected_id) REFERENCES answers (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  student_id BIGINT,
  course_id BIGINT,
  amount DECIMAL(38,2),
  status VARCHAR(255) NOT NULL DEFAULT 'PENDING',
  payment_code VARCHAR(255),
  created_at DATETIME(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_payment_code (payment_code),
  KEY idx_order_student (student_id),
  KEY idx_order_course (course_id),
  CONSTRAINT fk_order_student FOREIGN KEY (student_id) REFERENCES `users` (id),
  CONSTRAINT fk_order_course FOREIGN KEY (course_id) REFERENCES courses (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enrollments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  student_id BIGINT,
  course_id BIGINT,
  enrolled_at DATETIME(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollment_student_course (student_id, course_id),
  KEY idx_enrollment_course (course_id),
  CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) REFERENCES `users` (id),
  CONSTRAINT fk_enrollment_course FOREIGN KEY (course_id) REFERENCES courses (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS roles (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, description VARCHAR(255));
CREATE TABLE IF NOT EXISTS course_categories (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, description VARCHAR(255), active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS question_banks (id BIGINT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), subject VARCHAR(255), description VARCHAR(255), teacher_id BIGINT, FOREIGN KEY(teacher_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS learning_materials (id BIGINT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), file_url VARCHAR(500), material_type VARCHAR(255), lesson_id BIGINT, FOREIGN KEY(lesson_id) REFERENCES lessons(id));
CREATE TABLE IF NOT EXISTS learning_progress (id BIGINT AUTO_INCREMENT PRIMARY KEY, enrollment_id BIGINT, lesson_id BIGINT, completed BOOLEAN NOT NULL DEFAULT TRUE, completed_at DATETIME(6), UNIQUE KEY uq_progress(enrollment_id,lesson_id), FOREIGN KEY(enrollment_id) REFERENCES enrollments(id), FOREIGN KEY(lesson_id) REFERENCES lessons(id));
ALTER TABLE users ADD role_definition_id BIGINT, ADD phone VARCHAR(255), ADD bio VARCHAR(255), ADD FOREIGN KEY(role_definition_id) REFERENCES roles(id);
ALTER TABLE courses ADD category_definition_id BIGINT, ADD level VARCHAR(255) DEFAULT 'BEGINNER', ADD FOREIGN KEY(category_definition_id) REFERENCES course_categories(id);
ALTER TABLE questions ADD bank_id BIGINT, ADD question_type VARCHAR(255) DEFAULT 'MULTIPLE_CHOICE', ADD ai_generated BOOLEAN NOT NULL DEFAULT FALSE, ADD FOREIGN KEY(bank_id) REFERENCES question_banks(id);
ALTER TABLE quiz_attempts ADD started_at DATETIME(6);
ALTER TABLE quiz_attempt_answers ADD question_text VARCHAR(3000), ADD explanation VARCHAR(3000), ADD selected_text VARCHAR(255), ADD correct_text VARCHAR(255), ADD correct BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payment_transactions ADD transaction_reference VARCHAR(255) UNIQUE, ADD payment_date DATETIME(6);
ALTER TABLE payment_transactions ADD expires_at DATETIME(6), ADD cancelled_at DATETIME(6), ADD paid_amount DECIMAL(38,2), ADD reconciliation_note VARCHAR(500);
ALTER TABLE payment_transactions ADD original_amount DECIMAL(38,2), ADD discount_amount DECIMAL(38,2) DEFAULT 0, ADD voucher_code VARCHAR(100), ADD webhook_payload VARCHAR(2000);
ALTER TABLE enrollments ADD status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', ADD archived BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS wishlist_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, student_id BIGINT NOT NULL, course_id BIGINT NOT NULL, created_at DATETIME(6),
  UNIQUE KEY uq_wishlist_student_course(student_id, course_id),
  FOREIGN KEY(student_id) REFERENCES users(id), FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS course_reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY, student_id BIGINT NOT NULL, course_id BIGINT NOT NULL,
  rating INT NOT NULL, comment VARCHAR(1000), created_at DATETIME(6), updated_at DATETIME(6),
  UNIQUE KEY uq_review_student_course(student_id, course_id),
  FOREIGN KEY(student_id) REFERENCES users(id), FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB;
