-- Apply once if Hibernate schema updates are disabled.
ALTER TABLE quiz_attempts ADD COLUMN ai_feedback VARCHAR(12000) NULL;
