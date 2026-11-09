import React, { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Select, Spin, Tag, message } from "antd";
import { BookOpen, Check, Layers, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { post } from "../api";

export function LessonBatchAiModal({ open, module, course, onApplied, onClose }) {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [lessonCount, setLessonCount] = useState(4);
  const [language, setLanguage] = useState("Vietnamese");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    if (!open || !module) return;
    setTopic(module.title || "");
    setContext(course?.context || "");
    setLessonCount(4);
    setLanguage("Vietnamese");
    setError("");
    setLessons([]);
    setLoading(false);
    setApplying(false);
  }, [open, module, course]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập chủ đề cho loạt bài học.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await post("/teacher/ai/generate-lessons", {
        courseId: course?.id,
        moduleId: module.id,
        topic: topic.trim(),
        context: context.trim(),
        lessonCount,
        language,
      });
      const items = (res.lessons || []).map((l) => ({
        ...l,
        selected: true,
      }));
      setLessons(items);
      if (!items.length) {
        setError("AI không trả về bài học nào, vui lòng thử lại.");
      } else {
        message.success(`AI đã sinh ${items.length} bài học cho module "${module.title}"!`);
      }
    } catch (err) {
      setError(err.message || "Lỗi khi sinh danh sách bài học.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const selectedLessons = lessons.filter((l) => l.selected);
    if (!selectedLessons.length) {
      setError("Vui lòng tích chọn ít nhất 1 bài học để thêm vào module.");
      return;
    }
    setApplying(true);
    setError("");
    try {
      const res = await post(`/teacher/modules/${module.id}/apply-lessons`, {
        lessons: selectedLessons,
      });
      message.success(`Đã thêm thành công ${res.addedLessons} bài học vào module "${module.title}"!`);
      if (onApplied) onApplied(res, module.id);
      onClose();
    } catch (err) {
      setError(err.message || "Lỗi khi áp dụng bài học vào module.");
    } finally {
      setApplying(false);
    }
  };

  const toggleSelect = (idx) => {
    setLessons((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, selected: !l.selected } : l))
    );
  };

  const toggleSelectAll = (checked) => {
    setLessons((prev) => prev.map((l) => ({ ...l, selected: checked })));
  };

  const updateLessonField = (idx, field, val) => {
    setLessons((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: val } : l))
    );
  };

  const removeLesson = (idx) => {
    setLessons((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectedCount = lessons.filter((l) => l.selected).length;

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={20} color="#6366f1" />
          <span style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700 }}>
            AI Sinh hàng loạt bài học cho Module
          </span>
        </div>
      }
      onCancel={onClose}
      width={780}
      maskClosable={false}
      footer={[
        <Button key="close" onClick={onClose} disabled={applying}>
          Đóng
        </Button>,
        lessons.length > 0 && (
          <Button
            key="regen"
            icon={<RotateCcw size={15} />}
            onClick={handleGenerate}
            disabled={loading || applying}
          >
            Tạo lại
          </Button>
        ),
        lessons.length === 0 ? (
          <Button
            key="gen"
            type="primary"
            icon={<Sparkles size={16} />}
            loading={loading}
            onClick={handleGenerate}
          >
            Sinh danh sách bài học bằng AI
          </Button>
        ) : (
          <Button
            key="apply"
            type="primary"
            icon={<Check size={16} />}
            loading={applying}
            disabled={selectedCount === 0}
            onClick={handleApply}
            style={{ background: "#10b981", borderColor: "#10b981" }}
          >
            Thêm vào module ({selectedCount} bài học)
          </Button>
        ),
      ]}
    >
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          closable
          onClose={() => setError("")}
          style={{ marginBottom: 16 }}
        />
      )}

      <div
        style={{
          marginBottom: 14,
          padding: "10px 14px",
          background: "var(--paper-2)",
          border: "2px solid var(--ink)",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--ink-3)" }}>
          Module mục tiêu
        </span>
        <h3 style={{ margin: "2px 0 0", fontSize: 16, fontFamily: "var(--display)" }}>
          {module?.title || "Chưa chọn module"}
        </h3>
        {module?.description && (
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            {module.description}
          </p>
        )}
      </div>

      {lessons.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
              Chủ đề trọng tâm của loạt bài học <span style={{ color: "red" }}>*</span>
            </label>
            <Input
              size="large"
              value={topic}
              maxLength={200}
              placeholder="Ví dụ: Thiết kế RESTful API, Routing, Controllers và Middlewares"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
                Số lượng bài học muốn tạo
              </label>
              <InputNumber
                min={2}
                max={8}
                value={lessonCount}
                onChange={(v) => setLessonCount(v || 4)}
                style={{ width: "100%" }}
                size="large"
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
                Ngôn ngữ
              </label>
              <Select
                size="large"
                value={language}
                onChange={setLanguage}
                style={{ width: "100%" }}
                options={[
                  { value: "Vietnamese", label: "Tiếng Việt" },
                  { value: "English", label: "Tiếng Anh" },
                ]}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
              Định hướng / Yêu cầu chi tiết (tùy chọn)
            </label>
            <Input.TextArea
              rows={3}
              value={context}
              maxLength={1000}
              placeholder="Ví dụ: Chia nhỏ từ cài đặt môi trường, tạo route cơ bản đến xử lý request body, validation và middleware xác thực..."
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          {loading && (
            <div style={{ padding: "28px 0", textAlign: "center" }}>
              <Spin tip="AI đang phân tích kiến thức và thiết kế chuỗi bài học..." size="large" />
              <p className="muted" style={{ marginTop: 12 }}>
                Đang xây dựng {lessonCount} bài học có hệ thống cho module...
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              padding: "6px 10px",
              background: "var(--paper-2)",
              border: "1px solid var(--ink)",
            }}
          >
            <Checkbox
              checked={selectedCount === lessons.length && lessons.length > 0}
              indeterminate={selectedCount > 0 && selectedCount < lessons.length}
              onChange={(e) => toggleSelectAll(e.target.checked)}
            >
              Chọn tất cả ({selectedCount}/{lessons.length} bài)
            </Checkbox>
            <span className="muted" style={{ fontSize: 12 }}>
              Tích chọn bài học bạn muốn thêm vào module.
            </span>
          </div>

          <div style={{ maxHeight: "420px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {lessons.map((l, idx) => (
              <div
                key={idx}
                style={{
                  border: "2px solid var(--ink)",
                  background: l.selected ? "var(--card)" : "var(--paper)",
                  opacity: l.selected ? 1 : 0.65,
                  padding: "10px 12px",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Checkbox checked={l.selected} onChange={() => toggleSelect(idx)} />
                  <span
                    style={{
                      fontFamily: "var(--display)",
                      fontWeight: 700,
                      fontSize: 12,
                      color: "var(--ink-3)",
                      minWidth: 20,
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <Input
                    value={l.title}
                    onChange={(e) => updateLessonField(idx, "title", e.target.value)}
                    style={{ flex: 1, fontWeight: 600 }}
                  />
                  <Tag>{l.contentType || "TEXT"}</Tag>
                  <InputNumber
                    min={5}
                    max={120}
                    value={l.durationMinutes || 15}
                    addonAfter="phút"
                    style={{ width: 110 }}
                    onChange={(v) => updateLessonField(idx, "durationMinutes", v || 15)}
                  />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<Trash2 size={15} />}
                    onClick={() => removeLesson(idx)}
                    title="Bỏ bài này"
                  />
                </div>

                {l.content && (
                  <div
                    style={{
                      marginTop: 8,
                      marginLeft: 34,
                      padding: "6px 10px",
                      background: "var(--paper-2)",
                      border: "1px dashed var(--ink)",
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: "var(--ink-2)",
                      whiteSpace: "pre-wrap",
                      maxHeight: "80px",
                      overflowY: "auto",
                    }}
                  >
                    {l.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
