-- Learnova LMS — Course / Module / Lesson content management (2026-10-30)
-- Run once against an existing database:
--   mysql -u lms -p learnova_compact < database/migrations/2026-10-30_course_content.sql
-- It is safe to re-run: every change is guarded by information_schema checks.
-- Existing rows keep their data; lessons without a type become TEXT lessons.

USE learnova_compact;

DROP PROCEDURE IF EXISTS learnova_add_column;
DROP PROCEDURE IF EXISTS learnova_modify_column;

DELIMITER //

CREATE PROCEDURE learnova_add_column(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN ddl VARCHAR(500)
)
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

CREATE PROCEDURE learnova_modify_column(
  IN tbl VARCHAR(64),
  IN col VARCHAR(64),
  IN ddl VARCHAR(500)
)
BEGIN
  SET @sql = CONCAT('ALTER TABLE `', tbl, '` MODIFY COLUMN ', ddl);
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //

DELIMITER ;

-- courses ---------------------------------------------------------------
CALL learnova_add_column('courses', 'updated_at', '`updated_at` DATETIME(6) NULL');
CALL learnova_modify_column('courses', 'cover', '`cover` VARCHAR(500) NULL');
CALL learnova_add_column('courses', 'context', '`context` VARCHAR(2000) NULL');
UPDATE courses SET updated_at = NOW() WHERE updated_at IS NULL;

-- modules ---------------------------------------------------------------
CALL learnova_add_column('modules', 'description', '`description` VARCHAR(500) NULL');

-- lessons ---------------------------------------------------------------
CALL learnova_add_column('lessons', 'content_type', "`content_type` VARCHAR(20) NOT NULL DEFAULT 'TEXT'");
CALL learnova_add_column('lessons', 'duration_minutes', '`duration_minutes` INT NULL');
CALL learnova_add_column('lessons', 'file_url', '`file_url` VARCHAR(500) NULL');
CALL learnova_add_column('lessons', 'file_name', '`file_name` VARCHAR(255) NULL');
CALL learnova_modify_column('lessons', 'video_url', '`video_url` VARCHAR(500) NULL');

-- Lessons that already had a video are treated as video lessons.
UPDATE lessons SET content_type = 'VIDEO'
WHERE video_url IS NOT NULL AND video_url <> '' AND content_type = 'TEXT';

DROP PROCEDURE IF EXISTS learnova_add_column;
DROP PROCEDURE IF EXISTS learnova_modify_column;
