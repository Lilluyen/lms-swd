-- Learnova LMS — SE Pay lifecycle, wishlist and real course reviews.
USE learnova_compact;

DROP PROCEDURE IF EXISTS learnova_add_column;
DELIMITER //
CREATE PROCEDURE learnova_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl VARCHAR(500))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL learnova_add_column('payment_transactions', 'expires_at', '`expires_at` DATETIME(6) NULL');
CALL learnova_add_column('payment_transactions', 'cancelled_at', '`cancelled_at` DATETIME(6) NULL');
CALL learnova_add_column('payment_transactions', 'paid_amount', '`paid_amount` DECIMAL(38,2) NULL');
CALL learnova_add_column('payment_transactions', 'reconciliation_note', '`reconciliation_note` VARCHAR(500) NULL');

CREATE TABLE IF NOT EXISTS wishlist_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  created_at DATETIME(6),
  UNIQUE KEY uq_wishlist_student_course(student_id, course_id),
  CONSTRAINT fk_wishlist_student FOREIGN KEY(student_id) REFERENCES users(id),
  CONSTRAINT fk_wishlist_course FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_reviews (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  course_id BIGINT NOT NULL,
  rating INT NOT NULL,
  comment VARCHAR(1000),
  created_at DATETIME(6),
  updated_at DATETIME(6),
  UNIQUE KEY uq_review_student_course(student_id, course_id),
  CONSTRAINT fk_review_student FOREIGN KEY(student_id) REFERENCES users(id),
  CONSTRAINT fk_review_course FOREIGN KEY(course_id) REFERENCES courses(id)
) ENGINE=InnoDB;

UPDATE payment_transactions
SET expires_at = DATE_ADD(COALESCE(created_at, NOW()), INTERVAL 15 MINUTE)
WHERE expires_at IS NULL AND status = 'PENDING';

DROP PROCEDURE IF EXISTS learnova_add_column;
