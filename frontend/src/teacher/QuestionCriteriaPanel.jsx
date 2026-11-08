import React from "react";
import { Button, Input, InputNumber, Select } from "antd";
import { FileText, Sparkles } from "lucide-react";
import { Field } from "./shared";

/** Steps 1-2 of the AI question studio: criteria and lesson context. */
export function QuestionCriteriaPanel({
  form,
  set,
  errors,
  courses,
  modules,
  lessons,
  courseId,
  moduleId,
  onChooseCourse,
  onChooseModule,
  onUseLesson,
  generating,
  draftCount,
  onGenerate,
}) {
  return (
    <section
      className="panel question-ai-criteria"
      aria-labelledby="criteria-title"
    >
      <div className="panel-heading">
        <div>
          <span className="step-number">1</span>
          <h2 id="criteria-title">Tiêu chí tạo</h2>
        </div>
        <span className="badge">Chưa tự động lưu</span>
      </div>
      <div className="form-grid">
        <Field label="Môn học" required error={errors.subject}>
          <Input
            maxLength={100}
            value={form.subject}
            onChange={(e) => set("subject", e.target.value)}
            placeholder="Ví dụ: Lập trình Java"
          />
        </Field>
        <Field label="Chủ đề cần kiểm tra" required error={errors.topic}>
          <Input
            maxLength={255}
            value={form.topic}
            onChange={(e) => set("topic", e.target.value)}
            placeholder="Ví dụ: Dependency Injection"
          />
        </Field>
      </div>
      <div className="form-grid compact-three">
        <Field label="Loại câu hỏi" required error={errors.questionType}>
          <Select
            value={form.questionType}
            onChange={(v) => set("questionType", v)}
            options={[{ value: "MULTIPLE_CHOICE", label: "Multiple Choice" }]}
          />
        </Field>
        <Field label="Độ khó" required error={errors.difficulty}>
          <Select
            value={form.difficulty}
            onChange={(v) => set("difficulty", v)}
            options={[
              { value: "EASY", label: "Dễ" },
              { value: "MEDIUM", label: "Trung bình" },
              { value: "HARD", label: "Khó" },
            ]}
          />
        </Field>
        <Field label="Số câu" required error={errors.quantity}>
          <InputNumber
            min={1}
            max={20}
            value={form.quantity}
            onChange={(v) => set("quantity", v || 1)}
            style={{ width: "100%" }}
          />
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Ngôn ngữ" required error={errors.language}>
          <Select
            value={form.language}
            onChange={(v) => set("language", v)}
            options={[
              { value: "VIETNAMESE", label: "Tiếng Việt" },
              { value: "ENGLISH", label: "English" },
            ]}
          />
        </Field>
        <Field
          label="Yêu cầu bổ sung"
          error={errors.instructions}
          hint={`${form.instructions.trim().length}/1.000 ký tự`}
        >
          <Input
            maxLength={1000}
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
            placeholder="Ví dụ: ưu tiên câu hỏi tình huống"
          />
        </Field>
      </div>

      <div className="context-source">
        <div className="context-source-head">
          <div>
            <span className="step-number">2</span>
            <h2>Nội dung bài học</h2>
          </div>
          <span className="required-note">Bắt buộc</span>
        </div>
        <p className="muted">
          Chọn bài học Text có sẵn hoặc tự dán nội dung. Bạn luôn có thể sửa lại
          trước khi gửi AI.
        </p>
        <div className="lesson-picker">
          <div className="lesson-picker-row">
            <Select
              allowClear
              showSearch
              popupMatchSelectWidth={false}
              optionFilterProp="label"
              placeholder="Chọn khóa học"
              value={courseId}
              onChange={onChooseCourse}
              options={courses.map((item) => ({ value: item.id, label: item.title }))}
            />
            <Select
              allowClear
              showSearch
              popupMatchSelectWidth={false}
              optionFilterProp="label"
              placeholder="Chọn module"
              value={moduleId}
              disabled={!courseId}
              onChange={onChooseModule}
              options={modules.map((item) => ({
                value: item.id,
                label: `${item.position}. ${item.title}`,
              }))}
            />
          </div>
          <div className="lesson-picker-row lesson-picker-row-action">
            <Select
              allowClear
              showSearch
              popupMatchSelectWidth={false}
              optionFilterProp="label"
              placeholder="Chọn bài học"
              value={form.lessonId}
              disabled={!moduleId}
              onChange={(v) => set("lessonId", v)}
              options={lessons.map((item) => ({
                value: item.id,
                label: `${item.position}. ${item.title} · ${item.contentType}`,
              }))}
            />
            <Button
              className="lesson-picker-btn"
              icon={<FileText size={16} />}
              disabled={!form.lessonId}
              onClick={onUseLesson}
            >
              Dùng nội dung bài
            </Button>
          </div>
        </div>
        {errors.lessonId && (
          <span className="field-err lesson-error">{errors.lessonId}</span>
        )}
        <Field
          error={errors.context}
          hint={`${form.context.trim().length.toLocaleString("vi-VN")}/20.000 ký tự`}
        >
          <Input.TextArea
            className="lesson-context-editor"
            rows={14}
            maxLength={20000}
            value={form.context}
            onChange={(e) => set("context", e.target.value)}
            placeholder="Dán nội dung bài học, khái niệm, ví dụ hoặc đoạn mã muốn dùng để tạo câu hỏi. AI sẽ giới hạn phạm vi kiến thức theo nội dung này."
            aria-label="Nội dung bài học bắt buộc cho AI tạo câu hỏi"
          />
        </Field>
      </div>
      <Button
        type="primary"
        size="large"
        block
        icon={<Sparkles size={17} />}
        loading={generating}
        disabled={generating}
        onClick={onGenerate}
      >
        {draftCount ? "Tạo lại bản nháp" : "Tạo bản nháp câu hỏi"}
      </Button>
    </section>
  );
}
