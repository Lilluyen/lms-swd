import React, { useEffect, useState } from "react";
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Radio, Select, Spin, Tag, message } from "antd";
import { BookOpen, Check, Layers, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { api, post } from "../api";

function renumberLessonTitles(items, startNumber) {
  return items.map((l, idx) => {
    const num = startNumber + idx;
    let title = l.title || "";
    if (/^bài\s*\d+\s*[:.-]?\s*/i.test(title)) {
      title = title.replace(/^bài\s*\d+\s*[:.-]?\s*/i, `Bài ${num}: `);
    } else if (!title.toLowerCase().startsWith("bài ")) {
      title = `Bài ${num}: ${title}`;
    }
    return { ...l, title };
  });
}

export function LessonBatchAiModal({ open, module, course, existingLessons = [], onApplied, onClose }) {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [lessonCount, setLessonCount] = useState(4);
  const [language, setLanguage] = useState("Vietnamese");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState([]);
  const [existingList, setExistingList] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(true);

  useEffect(() => {
    if (!open || !module) return;
    setTopic(module.title || "");
    setContext(course?.context || "");
    setError("");
    setLessons([]);
    setLoading(false);
    setApplying(false);

    const initList = async () => {
      let cur = existingLessons || [];
      if ((!cur || !cur.length) && module.id) {
        try {
          const res = await api(`/teacher/modules/${module.id}/lessons`);
          cur = res.lessons || [];
        } catch (_) {}
      }
      setExistingList(cur);
      const count = cur.length > 0 ? Math.min(10, Math.max(2, cur.length)) : 4;
      setLessonCount(count);
      setReplaceExisting(cur.length > 0);
    };
    initList();
  }, [open, module, course, existingLessons]);

  const handleModeChange = (newReplace) => {
    setReplaceExisting(newReplace);
    if (lessons.length > 0) {
      const startNum = (!newReplace && existingList.length > 0) ? existingList.length + 1 : 1;
      setLessons((prev) => renumberLessonTitles(prev, startNum));
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập chủ đề cho loạt bài học.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const isReplacing = replaceExisting && existingList.length > 0;
      const res = await post("/teacher/ai/generate-lessons", {
        courseId: course?.id,
        moduleId: module.id,
        topic: topic.trim(),
        context: context.trim(),
        lessonCount,
        language,
        replaceExisting: isReplacing,
      });

      const startNumber = (!isReplacing && existingList.length > 0) ? existingList.length + 1 : 1;
      const rawItems = (res.lessons || []).map((l) => ({
        ...l,
        selected: true,
      }));
      const items = renumberLessonTitles(rawItems, startNumber);

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
      setError("Vui lòng tích chọn ít nhất 1 bài học để đưa vào module.");
      return;
    }
    setApplying(true);
    setError("");
    try {
      const isReplacing = replaceExisting && existingList.length > 0;
      const res = await post(`/teacher/modules/${module.id}/apply-lessons`, {
        lessons: selectedLessons,
        replaceExisting: isReplacing,
      });
      if (isReplacing) {
        message.success(`Đã thay thế và cập nhật thành công ${res.addedLessons} bài học vào module "${module.title}"!`);
      } else {
        message.success(`Đã thêm thành công ${res.addedLessons} bài học tiếp theo vào module "${module.title}"!`);
      }
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
    setLessons((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const startNum = (!replaceExisting && existingList.length > 0) ? existingList.length + 1 : 1;
      return renumberLessonTitles(next, startNum);
    });
  };

  const selectedCount = lessons.filter((l) => l.selected).length;
  const startNumber = (!replaceExisting && existingList.length > 0) ? existingList.length + 1 : 1;

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
            icon={replaceExisting && existingList.length > 0 ? <Layers size={16} /> : <Check size={16} />}
            loading={applying}
            disabled={selectedCount === 0}
            onClick={handleApply}
            style={{
              background: replaceExisting && existingList.length > 0 ? "#4f46e5" : "#10b981",
              borderColor: replaceExisting && existingList.length > 0 ? "#4f46e5" : "#10b981",
            }}
          >
            {replaceExisting && existingList.length > 0
              ? `Thay thế bài cũ (${selectedCount} bài học)`
              : `Thêm vào module từ Bài ${startNumber} (${selectedCount} bài học)`}
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
          marginBottom: 12,
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

      {existingList.length > 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "rgba(99, 102, 241, 0.06)",
            border: "1.5px solid #818cf8",
            borderRadius: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#4338ca", fontSize: 13 }}>
              <Layers size={16} />
              Module đã có sẵn {existingList.length} bài học (từ khung khóa học):
            </div>
            <Radio.Group
              size="small"
              value={replaceExisting}
              onChange={(e) => handleModeChange(e.target.value)}
            >
              <Radio.Button value={true} style={{ fontWeight: 600 }}>
                🔄 Thay thế bài cũ (1 - {existingList.length})
              </Radio.Button>
              <Radio.Button value={false}>
                ➕ Thêm tiếp (từ Bài {existingList.length + 1})
              </Radio.Button>
            </Radio.Group>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {existingList.map((el, i) => (
              <Tag key={el.id || i} color="geekblue" style={{ fontSize: 11.5, padding: "2px 8px" }}>
                #{i + 1} {el.title}
              </Tag>
            ))}
          </div>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 11.5 }}>
            {replaceExisting
              ? "💡 Chế độ THAY THẾ: AI sẽ dựa trên khung bài học trên để sinh nội dung chi tiết và ghi đè bài cũ (bắt đầu từ Bài 1)."
              : `💡 Chế độ THÊM TIẾP: Giữ nguyên ${existingList.length} bài cũ, các bài học mới sinh sẽ được đánh số tiếp nối tự động từ Bài ${existingList.length + 1}.`}
          </p>
        </div>
      )}

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
                Số lượng bài học muốn {replaceExisting ? "tạo" : "thêm tiếp"}
              </label>
              <InputNumber
                min={1}
                max={10}
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
                Đang xây dựng {lessonCount} bài học {replaceExisting ? "" : `(tiếp nối từ Bài ${startNumber})`} cho module...
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
              {replaceExisting && existingList.length > 0
                ? "Các bài học được chọn sẽ thay thế bài học cũ trong module."
                : `Các bài học sẽ được thêm tiếp từ Bài #${startNumber} vào module.`}
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
                      minWidth: 26,
                    }}
                  >
                    #{startNumber + idx}
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
                      maxHeight: "100px",
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
