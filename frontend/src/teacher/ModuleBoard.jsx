import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, message } from "antd";
import { Plus, Sparkles } from "lucide-react";
import { api, del, post, put } from "../api";
import { Crumb, errorsOf } from "./shared";
import { ModuleFormPanel } from "./ModuleFormPanel";
import { ModuleList } from "./ModuleList";
import { AiDialog } from "./AiDialog";
import { CurriculumAiModal } from "./CurriculumAiModal";
import { LessonBatchAiModal } from "./LessonBatchAiModal";

/** Container for the Teacher module/lesson structure screen. */
export function ModuleBoard({ courseId, onBack, onEditLesson, onAddLesson }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ id: null, title: "", description: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [openLessons, setOpenLessons] = useState(null);
  const [lessons, setLessons] = useState({});
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [curriculumAiOpen, setCurriculumAiOpen] = useState(false);
  const [batchLessonModule, setBatchLessonModule] = useState(null);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api(`/teacher/courses/${courseId}/modules`));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [courseId]);

  const modules = data?.modules || [];
  const course = data?.course;

  const loadLessons = async (moduleId) => {
    try {
      const r = await api(`/teacher/modules/${moduleId}/lessons`);
      setLessons((m) => ({ ...m, [moduleId]: r.lessons }));
    } catch (e) {
      message.error(e.message);
    }
  };

  const toggleLessons = (moduleId) => {
    setOpenLessons((v) => (v === moduleId ? null : moduleId));
    if (!lessons[moduleId]) loadLessons(moduleId);
  };

  const reset = () => {
    setDraft({ id: null, title: "", description: "" });
    setErrors({});
  };

  const changeDraft = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const saveModule = async () => {
    const e = {};
    if (draft.title.trim().length < 3 || draft.title.trim().length > 100)
      e.title = "Tên module phải từ 3 đến 100 ký tự";
    if (draft.description.trim().length > 500)
      e.description = "Mô tả tối đa 500 ký tự";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const body = {
        title: draft.title.trim(),
        description: draft.description.trim(),
      };
      if (draft.id) {
        const r = await put(`/teacher/modules/${draft.id}`, body);
        setData((d) => ({ ...d, modules: r.modules }));
        message.success("Đã cập nhật module");
      } else {
        const r = await post(`/teacher/courses/${courseId}/modules`, body);
        setData((d) => ({ ...d, modules: r.modules }));
        message.success("Đã thêm module");
      }
      reset();
      setModuleModalOpen(false);
    } catch (err) {
      const fields = errorsOf(err);
      if (fields) setErrors(fields);
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editModule = (m) => {
    setDraft({
      id: m.id,
      title: m.title || "",
      description: m.description || "",
    });
    setErrors({});
    setModuleModalOpen(true);
  };

  const removeModule = (m) =>
    Modal.confirm({
      title: "Xóa module?",
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            <b>{m.title}</b> sẽ bị xóa cùng{" "}
            <b>{m.lessonCount || 0} bài học</b> bên trong. Thao tác này không
            thể hoàn tác.
          </p>
        </div>
      ),
      okText: "Xóa module",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const r = await del(`/teacher/modules/${m.id}`);
          setData((d) => ({ ...d, modules: r.modules }));
          setLessons((s) => {
            const copy = { ...s };
            delete copy[m.id];
            return copy;
          });
          if (draft.id === m.id) reset();
          message.success("Đã xóa module và toàn bộ bài học");
        } catch (e) {
          message.error(e.message);
          throw e;
        }
      },
    });

  const persistOrder = async (ordered) => {
    setData((d) => ({ ...d, modules: ordered }));
    try {
      const r = await put(`/teacher/courses/${courseId}/modules/order`, {
        ids: ordered.map((m) => m.id),
      });
      setData((d) => ({ ...d, modules: r.modules }));
    } catch (e) {
      message.error(e.message);
      load();
    }
  };

  const onDrop = (targetId) => {
    setOverId(null);
    if (!dragId || dragId === targetId) return setDragId(null);
    const list = [...modules];
    const from = list.findIndex((m) => m.id === dragId);
    const to = list.findIndex((m) => m.id === targetId);
    if (from < 0 || to < 0) return setDragId(null);
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setDragId(null);
    persistOrder(list);
  };

  const removeLesson = (l) =>
    Modal.confirm({
      title: "Xóa bài học?",
      content: `Bài học "${l.title}" sẽ bị xóa vĩnh viễn.`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const r = await del(`/teacher/lessons/${l.id}`);
          setLessons((m) => ({ ...m, [l.moduleId]: r.lessons }));
          setData((d) => ({
            ...d,
            modules: d.modules.map((m) =>
              m.id === l.moduleId
                ? { ...m, lessonCount: r.lessons.length }
                : m,
            ),
          }));
          message.success("Đã xóa bài học");
        } catch (e) {
          message.error(e.message);
          throw e;
        }
      },
    });

  return (
    <>
      <Crumb
        items={[
          { label: "Khóa học", onClick: onBack },
          { label: course?.title || "Khóa học", onClick: onBack },
          { label: "Modules" },
        ]}
      />
      <div className="t-head">
        <div className="page-title" style={{ marginBottom: 0 }}>
          <span className="kicker">CẤU TRÚC KHÓA HỌC</span>
          <h1>{course?.title || "Modules"}</h1>
          <p>
            {modules.length} module ·{" "}
            {modules.reduce((n, m) => n + (m.lessonCount || 0), 0)} bài học. Kéo
            thả để đổi thứ tự, thứ tự được lưu ngay.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            size="large"
            icon={<Sparkles size={16} />}
            onClick={() => setCurriculumAiOpen(true)}
            style={{
              borderColor: "#6366f1",
              color: "#6366f1",
              fontWeight: 600,
            }}
          >
            AI Sinh khung Modules & Lessons
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<Plus size={16} />}
            onClick={() => {
              reset();
              setModuleModalOpen(true);
            }}
          >
            Thêm module
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={
            <Button size="small" onClick={load}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {modules.length === 0 && !loading && course?.description && (
        <div
          style={{
            marginBottom: 20,
            padding: "16px 20px",
            background: "var(--card)",
            border: "2px solid #6366f1",
            boxShadow: "var(--hard-sm)",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#e0e7ff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={24} color="#6366f1" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontFamily: "var(--display)" }}>
              Khóa học đã có đặc tả nội dung sẵn sàng!
            </h3>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.6,
                maxHeight: "72px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
            >
              "{course.description}"
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                type="primary"
                icon={<Sparkles size={16} />}
                onClick={() => setCurriculumAiOpen(true)}
                style={{ background: "#6366f1", borderColor: "#6366f1", fontWeight: 700 }}
              >
                Tự động tạo khung Modules & Lessons từ đặc tả này
              </Button>
              <span className="muted" style={{ fontSize: 12 }}>
                AI sẽ phân rã toàn bộ đặc tả thành các module và chuỗi bài học tương ứng.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <ModuleList
          modules={modules}
          loading={loading}
          dragId={dragId}
          overId={overId}
          onDragStart={setDragId}
          onDragEnd={() => {
            setDragId(null);
            setOverId(null);
          }}
          onDragOver={setOverId}
          onDragLeave={(id) => setOverId((v) => (v === id ? null : v))}
          onDrop={onDrop}
          openLessons={openLessons}
          lessons={lessons}
          onToggleLessons={toggleLessons}
          onEditModule={editModule}
          onRemoveModule={removeModule}
          onEditLesson={onEditLesson}
          onAddLesson={onAddLesson}
          onRemoveLesson={removeLesson}
          onAiBatchLessons={(m) => setBatchLessonModule(m)}
          onOpenCurriculumAi={() => setCurriculumAiOpen(true)}
        />
      </div>

      <ModuleFormPanel
        open={moduleModalOpen}
        draft={draft}
        errors={errors}
        saving={saving}
        onChange={changeDraft}
        onSave={saveModule}
        onClose={() => {
          setModuleModalOpen(false);
          reset();
        }}
        onOpenAi={() => setAiOpen(true)}
      />

      <AiDialog
        open={aiOpen}
        defaultContentType="MODULE_DESCRIPTION"
        defaults={{
          topic: draft.title || course?.title || "",
          context: course?.context || course?.description || "",
          courseId,
        }}
        onAccept={(text, aiForm) => {
          setDraft((prev) => ({
            ...prev,
            description: text,
            title: prev.title?.trim() ? prev.title : (aiForm?.topic?.trim() || prev.title),
          }));
          setErrors((e) => ({ ...e, description: undefined, title: undefined }));
          message.success("Đã áp dụng nội dung AI vào module");
        }}
        onClose={() => setAiOpen(false)}
      />

      <CurriculumAiModal
        open={curriculumAiOpen}
        course={course}
        courseId={courseId}
        onApplied={(res) => {
          setData((d) => ({ ...d, modules: res.modules }));
        }}
        onClose={() => setCurriculumAiOpen(false)}
      />

      <LessonBatchAiModal
        open={Boolean(batchLessonModule)}
        module={batchLessonModule}
        course={course}
        onApplied={(res, mId) => {
          setLessons((prev) => ({ ...prev, [mId]: res.lessons }));
          setData((d) => ({ ...d, modules: res.modules }));
          setOpenLessons(mId);
        }}
        onClose={() => setBatchLessonModule(null)}
      />
    </>
  );
}
