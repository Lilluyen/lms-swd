import React from "react";
import { Input, Select, Modal, Button } from "antd";
import { Check, Clock, RotateCcw, Pencil, Sparkles } from "lucide-react";
import { Field } from "./shared";

/** Modal body for AI generation dialog. */
export function AiDialogContent({
  open,
  form,
  set,
  errors,
  status,
  result,
  setResult,
  editing,
  min,
  max,
  within,
  onAccept,
  onReject,
  onEdit,
  onFinishEdit,
  onClose,
  generate,
}) {
  return (
    <Modal
      open={open}
      title="Generate with AI"
      onCancel={onClose}
      width={680}
      maskClosable={false}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        result && (
          <Button key="reject" icon={<RotateCcw size={15} />} onClick={onReject}>
            Reject
          </Button>
        ),
        result && !editing && (
          <Button key="edit" icon={<Pencil size={15} />} onClick={() => onEdit(true)}>
            Edit
          </Button>
        ),
        result && editing && (
          <Button key="finish-edit" onClick={onFinishEdit}>
            Xong chỉnh sửa
          </Button>
        ),
        result && (
          <Button
            key="accept"
            type="primary"
            icon={<Check size={16} />}
            disabled={!within || editing}
            onClick={onAccept}
          >
            Accept
          </Button>
        ),
        <Button
          key="generate"
          type="primary"
          icon={<Sparkles size={16} />}
          loading={status.state === "LOADING"}
          disabled={status.state === "LOADING"}
          onClick={generate}
        >
          {result ? "Generate again" : "Generate"}
        </Button>,
      ]}
    >
      <div className="ai-grid">
        <Field
          label="Topic"
          required
          error={errors.topic}
          hint={`${form.topic.trim().length}/200 ký tự`}
        >
          <Input maxLength={200} value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="Chủ đề nội dung cần tạo" />
        </Field>
        <Field
          label="Learning objective (không bắt buộc)"
          error={errors.objective}
          hint={`${form.objective.trim().length}/500 ký tự`}
        >
          <Input maxLength={500} value={form.objective} onChange={(e) => set("objective", e.target.value)} placeholder="Học viên sẽ làm được gì sau nội dung này?" />
        </Field>
        <div className="form-grid">
          <Field label="Level" required error={errors.level}>
            <Select value={form.level} onChange={(v) => set("level", v)} options={[
              { value: "BEGINNER", label: "Beginner" },
              { value: "INTERMEDIATE", label: "Intermediate" },
              { value: "ADVANCED", label: "Advanced" },
            ]} />
          </Field>
          <Field label="Content type" required error={errors.contentType}>
            <Select value={form.contentType} disabled options={[
              { value: "COURSE_DESCRIPTION", label: "Course description" },
              { value: "MODULE_DESCRIPTION", label: "Module description" },
              { value: "LESSON_CONTENT", label: "Lesson content" },
            ]} />
          </Field>
          <Field label="Language" required error={errors.language}>
            <Select value={form.language} onChange={(v) => set("language", v)} options={[
              { value: "ENGLISH", label: "English" },
              { value: "VIETNAMESE", label: "Vietnamese" },
            ]} />
          </Field>
        </div>
        <Field
          label="Ngữ cảnh giảng dạy / nội dung tham khảo"
          error={errors.context}
          hint={`${form.context.trim().length.toLocaleString("vi-VN")}/20.000 ký tự · Dán bài giảng, định nghĩa, ví dụ, đoạn mã hoặc phạm vi cần tránh.`}
        >
          <Input.TextArea
            className="ai-context-editor"
            rows={8}
            maxLength={20000}
            value={form.context}
            onChange={(e) => set("context", e.target.value)}
            placeholder="Dán nội dung đã dạy hoặc tài liệu tham khảo. AI sẽ dùng phần này làm nguồn chính để tạo nội dung sát với bài học."
            aria-label="Ngữ cảnh giảng dạy và nội dung tham khảo cho AI"
          />
        </Field>
      </div>

      <div className={"ai-status " + status.state.toLowerCase()}>
        {status.state === "LOADING" ? (
          <span><Clock size={14} /> Generating…</span>
        ) : status.state === "ERROR" ? (
          <span>{status.message}</span>
        ) : (
          <span>{status.message || "Ready"}</span>
        )}
      </div>

      <div className="ai-preview">
        {!result ? (
          <p className="muted" style={{ margin: 0 }}>Preview trống. Nhập yêu cầu và bấm Generate để tạo nội dung.</p>
        ) : editing ? (
          <Input.TextArea rows={10} value={result.text} onChange={(e) => setResult({ ...result, text: e.target.value })} />
        ) : (
          <pre className="ai-text">{result.text}</pre>
        )}
      </div>
      {result && (
        <div className="ai-meta">
          <span className={within ? "ok" : "warn"}>
            {result.text.length.toLocaleString("vi-VN")} / {max.toLocaleString("vi-VN")} ký tự
          </span>
          {!within && (
            <span className="warn">
              {result.text.length < min ? `Cần ít nhất ${min} ký tự` : `Vượt giới hạn ${max.toLocaleString("vi-VN")} ký tự — hãy Edit hoặc tạo lại`}
            </span>
          )}
          <span className="hint" style={{ marginLeft: "auto" }}>
            Accept chỉ điền vào form; bạn vẫn phải bấm Save để lưu.
          </span>
        </div>
      )}
    </Modal>
  );
}
