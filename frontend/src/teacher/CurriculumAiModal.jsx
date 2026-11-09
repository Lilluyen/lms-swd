import React, { useEffect, useState } from "react";
import { Alert, Button, Collapse, Empty, Input, InputNumber, Modal, Select, Spin, Tag, message } from "antd";
import { BookOpen, Check, Layers, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { post } from "../api";

export function CurriculumAiModal({ open, course, courseId, onApplied, onClose }) {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [moduleCount, setModuleCount] = useState(4);
  const [lessonsPerModule, setLessonsPerModule] = useState(3);
  const [language, setLanguage] = useState("Vietnamese");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [modules, setModules] = useState([]);

  useEffect(() => {
    if (!open) return;
    setTopic(course?.title || "");
    const spec = course?.description ? course.description.trim() : "";
    const ctx = course?.context ? course.context.trim() : "";
    setContext(ctx || spec || "");
    setModuleCount(4);
    setLessonsPerModule(3);
    setLanguage("Vietnamese");
    setError("");
    setModules([]);
    setLoading(false);
    setApplying(false);
  }, [open, course]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập chủ đề hoặc tiêu đề khóa học.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await post("/teacher/ai/generate-curriculum", {
        courseId,
        topic: topic.trim(),
        context: context.trim(),
        moduleCount,
        lessonsPerModule,
        language,
      });
      setModules(res.modules || []);
      if (!res.modules || !res.modules.length) {
        setError("AI không trả về module nào, vui lòng thử lại.");
      } else {
        message.success(`AI đã phác thảo xong ${res.modules.length} module!`);
      }
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi tạo khung chương trình.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!modules.length) return;
    setApplying(true);
    setError("");
    try {
      const res = await post(`/teacher/courses/${courseId}/apply-curriculum`, { modules });
      message.success(`Đã thêm thành công ${res.addedModules} module và ${res.addedLessons} bài học!`);
      if (onApplied) onApplied(res);
      onClose();
    } catch (err) {
      setError(err.message || "Lỗi khi áp dụng khung chương trình.");
    } finally {
      setApplying(false);
    }
  };

  const removeModule = (mIdx) => {
    setModules((prev) => prev.filter((_, i) => i !== mIdx));
  };

  const removeLesson = (mIdx, lIdx) => {
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mIdx) return m;
        return {
          ...m,
          lessons: (m.lessons || []).filter((_, j) => j !== lIdx),
        };
      })
    );
  };

  const updateModuleTitle = (mIdx, val) => {
    setModules((prev) =>
      prev.map((m, i) => (i === mIdx ? { ...m, title: val } : m))
    );
  };

  const updateLessonTitle = (mIdx, lIdx, val) => {
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mIdx) return m;
        return {
          ...m,
          lessons: (m.lessons || []).map((l, j) => (j === lIdx ? { ...l, title: val } : l)),
        };
      })
    );
  };

  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={20} color="#6366f1" />
          <span style={{ fontFamily: "var(--display)", fontSize: 18, fontWeight: 700 }}>
            AI Sinh bộ khung Modules & Lessons cho Khóa học
          </span>
        </div>
      }
      onCancel={onClose}
      width={860}
      maskClosable={false}
      footer={[
        <Button key="close" onClick={onClose} disabled={applying}>
          Đóng
        </Button>,
        modules.length > 0 && (
          <Button
            key="regen"
            icon={<RotateCcw size={15} />}
            onClick={handleGenerate}
            disabled={loading || applying}
          >
            Tạo lại
          </Button>
        ),
        modules.length === 0 ? (
          <Button
            key="gen"
            type="primary"
            icon={<Sparkles size={16} />}
            loading={loading}
            onClick={handleGenerate}
          >
            Sinh bộ khung bằng AI
          </Button>
        ) : (
          <Button
            key="apply"
            type="primary"
            icon={<Check size={16} />}
            loading={applying}
            onClick={handleApply}
            style={{ background: "#10b981", borderColor: "#10b981" }}
          >
            Áp dụng vào khóa học (+{modules.length} modules, +{totalLessons} bài học)
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

      {modules.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {course?.description && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--paper-2)",
                border: "2px solid var(--ink)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <BookOpen size={15} color="#6366f1" />
                <strong style={{ fontSize: 12, textTransform: "uppercase", color: "var(--ink)" }}>
                  Đặc tả khóa học được áp dụng:
                </strong>
              </div>
              <div style={{ color: "var(--ink-2)", fontSize: 12.5, whiteSpace: "pre-wrap", maxHeight: 90, overflowY: "auto" }}>
                {course.description}
              </div>
              <span className="muted" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                AI sẽ tự động phân tích và bóc tách các kỹ năng, công nghệ trong đặc tả này thành các Module và Bài học.
              </span>
            </div>
          )}

          <p className="muted" style={{ margin: 0 }}>
            Gemini AI sẽ thiết kế toàn bộ cấu trúc chương trình học bao gồm các module và danh sách bài học chi tiết theo chuẩn sư phạm.
          </p>

          <div>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
              Chủ đề khóa học <span style={{ color: "red" }}>*</span>
            </label>
            <Input
              size="large"
              value={topic}
              maxLength={200}
              placeholder="Ví dụ: Xây dựng ứng dụng Fullstack với NodeJS, MongoDB & React"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
                Số lượng Modules
              </label>
              <InputNumber
                min={2}
                max={8}
                value={moduleCount}
                onChange={(v) => setModuleCount(v || 4)}
                style={{ width: "100%" }}
                size="large"
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
                Số bài học / Module
              </label>
              <InputNumber
                min={2}
                max={6}
                value={lessonsPerModule}
                onChange={(v) => setLessonsPerModule(v || 3)}
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
              Ngữ cảnh & Định hướng giảng dạy (không bắt buộc)
            </label>
            <Input.TextArea
              rows={3}
              value={context}
              maxLength={1000}
              placeholder="Ví dụ: Sinh viên năm 2 đã biết JavaScript cơ bản. Tập trung làm bài tập dự án thực chiến, giải thích cặn kẽ Error Handling và Async/Await."
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          {loading && (
            <div style={{ padding: "28px 0", textAlign: "center" }}>
              <Spin tip="AI đang phân tích và kiến tạo lộ trình học tập..." size="large" />
              <p className="muted" style={{ marginTop: 12 }}>
                Đang xây dựng {moduleCount} module với {moduleCount * lessonsPerModule} bài học hoàn chỉnh...
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
              padding: "8px 12px",
              background: "var(--paper-2)",
              border: "2px solid var(--ink)",
            }}
          >
            <div>
              <strong style={{ fontSize: 14 }}>Dự kiến cấu trúc:</strong>{" "}
              <Tag color="blue">{modules.length} modules</Tag>
              <Tag color="green">{totalLessons} bài học</Tag>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              Bạn có thể xem trước, sửa tiêu đề hoặc xóa bớt trước khi áp dụng.
            </span>
          </div>

          <div style={{ maxHeight: "480px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {modules.map((m, mIdx) => (
              <div
                key={mIdx}
                style={{
                  border: "2px solid var(--ink)",
                  background: "var(--card)",
                  padding: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      background: "var(--ink)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                    }}
                  >
                    MODULE {mIdx + 1}
                  </span>
                  <Input
                    value={m.title}
                    onChange={(e) => updateModuleTitle(mIdx, e.target.value)}
                    style={{ fontWeight: 700, flex: 1 }}
                  />
                  <Button
                    danger
                    type="text"
                    size="small"
                    icon={<Trash2 size={15} />}
                    onClick={() => removeModule(mIdx)}
                    title="Xóa module này"
                  />
                </div>

                {m.description && (
                  <p className="muted" style={{ fontSize: 12.5, margin: "0 0 8px" }}>
                    {m.description}
                  </p>
                )}

                <div
                  style={{
                    background: "var(--paper-2)",
                    border: "1px dashed var(--ink)",
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-3)" }}>
                    Danh sách bài học ({m.lessons?.length || 0}):
                  </span>
                  {(m.lessons || []).map((l, lIdx) => (
                    <div
                      key={lIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--card)",
                        padding: "4px 8px",
                        border: "1px solid rgba(0,0,0,0.1)",
                      }}
                    >
                      <span style={{ fontSize: 11, color: "var(--ink-3)", minWidth: 20 }}>
                        {mIdx + 1}.{lIdx + 1}
                      </span>
                      <Input
                        size="small"
                        value={l.title}
                        onChange={(e) => updateLessonTitle(mIdx, lIdx, e.target.value)}
                        style={{ flex: 1, fontSize: 12.5 }}
                      />
                      <Tag style={{ margin: 0, fontSize: 10 }}>{l.contentType || "TEXT"}</Tag>
                      <span className="muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                        {l.durationMinutes || 15}p
                      </span>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<Trash2 size={13} />}
                        onClick={() => removeLesson(mIdx, lIdx)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
