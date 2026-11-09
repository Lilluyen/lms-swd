import React, { useEffect, useState } from "react";
import { Button, Input, InputNumber, Modal, Select, Upload, message } from "antd";
import { Save, Trash2 } from "lucide-react";
import { api, del, post, put, upload } from "../api";
import { AiDialog } from "./AiDialog";
import { Crumb, Field, TYPES, errorsOf } from "./shared";
import { LessonBodyFields } from "./LessonBodyFields";

export function LessonEditor({ courseId, moduleId, lessonId, onDone, onCancel }) {
  const [course, setCourse] = useState(null);
  const [module, setModule] = useState(null);
  const [form, setForm] = useState({
    title: "",
    contentType: "TEXT",
    content: "",
    videoUrl: "",
    durationMinutes: 10,
    fileUrl: "",
    fileName: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await api(`/teacher/courses/${courseId}/modules`);
        if (!alive) return;
        setCourse(c.course);
        const m = (c.modules || []).find((x) => x.id === moduleId);
        setModule(m || null);

        if (lessonId) {
          const r = await api(`/teacher/modules/${moduleId}/lessons`);
          if (!alive) return;
          const found = (r.lessons || []).find((x) => x.id === lessonId);
          if (found) {
            setForm({
              title: found.title || "",
              contentType: found.contentType || "TEXT",
              content: found.content || "",
              videoUrl: found.videoUrl || "",
              durationMinutes: Number(found.durationMinutes || 10),
              fileUrl: found.fileUrl || "",
              fileName: found.fileName || "",
            });
          }
        }
      } catch (e) {
        message.error(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [courseId, moduleId, lessonId]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    const title = form.title.trim();
    if (title.length < 3 || title.length > 100)
      e.title = "Tên bài học phải từ 3 đến 100 ký tự";
    if (!["TEXT", "VIDEO", "FILE"].includes(form.contentType))
      e.contentType = "Vui lòng chọn loại bài học";
    const dur = Number(form.durationMinutes);
    if (!Number.isInteger(dur) || dur < 1 || dur > 600)
      e.durationMinutes = "Thời lượng phải từ 1 đến 600 phút";

    if (form.contentType === "TEXT") {
      const c = form.content.trim();
      if (c.length < 10 || c.length > 10000)
        e.content = "Nội dung bài học phải từ 10 đến 10.000 ký tự";
    } else if (form.contentType === "VIDEO") {
      const u = form.videoUrl.trim();
      if (!u) e.videoUrl = "Vui lòng nhập liên kết video";
      else if (u.length > 500) e.videoUrl = "Liên kết video tối đa 500 ký tự";
      else if (!/^https?:\/\//i.test(u))
        e.videoUrl = "Liên kết video phải bắt đầu bằng http:// hoặc https://";
    } else if (form.contentType === "FILE") {
      if (!form.fileUrl) e.fileUrl = "Vui lòng tải lên tệp bài học";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        contentType: form.contentType,
        durationMinutes: Number(form.durationMinutes),
        content: form.contentType === "TEXT" ? form.content.trim() : null,
        videoUrl: form.contentType === "VIDEO" ? form.videoUrl.trim() : null,
        fileUrl: form.contentType === "FILE" ? form.fileUrl : null,
        fileName: form.contentType === "FILE" ? form.fileName : null,
      };
      if (lessonId) {
        await put(`/teacher/lessons/${lessonId}`, payload);
        message.success("Đã cập nhật bài học");
      } else {
        await post(`/teacher/modules/${moduleId}/lessons`, payload);
        message.success("Đã thêm bài học");
      }
      onDone();
    } catch (e) {
      const fields = errorsOf(e);
      if (fields) setErrors(fields);
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const pickFile = async (file) => {
    setErrors((e) => ({ ...e, fileUrl: undefined }));
    if (file.size > 25 * 1024 * 1024) {
      setErrors((e) => ({ ...e, fileUrl: "Tệp bài học tối đa 25 MB" }));
      return;
    }
    setUploading(true);
    try {
      const r = await upload("/teacher/uploads", file, "lesson-file");
      setForm((f) => ({
        ...f,
        fileUrl: r.url,
        fileName: r.filename || file.name,
      }));
      message.success("Đã tải tệp bài học");
    } catch (e) {
      const fields = errorsOf(e);
      if (fields) setErrors(fields);
      else message.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = () =>
    Modal.confirm({
      title: "Xóa bài học?",
      content: `Bài học "${form.title}" sẽ bị xóa vĩnh viễn.`,
      okText: "Xóa bài học",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del(`/teacher/lessons/${lessonId}`);
          message.success("Đã xóa bài học");
          onDone();
        } catch (e) {
          message.error(e.message);
        }
      },
    });

  return (
    <>
      <Crumb
        items={[
          { label: "Khóa học", onClick: onCancel },
          { label: course?.title || "Khóa học", onClick: onCancel },
          { label: module?.title || "Module", onClick: onCancel },
          { label: lessonId ? form.title || "Chỉnh sửa" : "Thêm bài học" },
        ]}
      />
      <div className="page-title">
        <span className="kicker">
          {lessonId ? "CHỈNH SỬA BÀI HỌC" : "THÊM BÀI HỌC MỚI"}
        </span>
        <h1>{lessonId ? "Chỉnh sửa bài học" : "Thêm bài học"}</h1>
        <p>Thuộc module: {module?.title || "…"}</p>
      </div>

      <div
        className="panel"
        data-testid="lesson-form"
        style={{ opacity: loading ? 0.5 : 1 }}
      >
        <div className="form-grid">
          <Field
            label="Tên bài học"
            required
            error={errors.title}
            hint={`${form.title.trim().length}/100 ký tự`}
          >
            <Input
              maxLength={100}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ví dụ: Giới thiệu kiến trúc MVC"
            />
          </Field>
          <Field label="Loại bài học" required error={errors.contentType}>
            <Select
              value={form.contentType}
              onChange={(v) => set("contentType", v)}
              options={TYPES}
            />
          </Field>
        </div>

        <LessonBodyFields
          form={form}
          set={set}
          errors={errors}
          uploading={uploading}
          onPickFile={pickFile}
          onOpenAi={() => setAiOpen(true)}
        />

        <div className="form-grid">
          <Field
            label="Thời lượng (phút)"
            required
            error={errors.durationMinutes}
            hint="Từ 1 đến 600 phút"
          >
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              max={600}
              value={form.durationMinutes}
              onChange={(v) => set("durationMinutes", v)}
            />
          </Field>
        </div>

        <div className="form-actions">
          <Button
            type="primary"
            size="large"
            icon={<Save size={16} />}
            loading={saving}
            disabled={saving || loading}
            onClick={save}
          >
            Lưu bài học
          </Button>
          <Button size="large" onClick={onCancel} disabled={saving}>
            Hủy
          </Button>
          {lessonId && (
            <Button
              danger
              size="large"
              icon={<Trash2 size={16} />}
              onClick={remove}
              style={{ marginLeft: "auto" }}
            >
              Xóa bài học
            </Button>
          )}
        </div>
      </div>

      <AiDialog
        open={aiOpen}
        defaultContentType="LESSON_CONTENT"
        defaults={{
          topic: form.title,
          level: course?.level || "BEGINNER",
          context: course?.context || "",
          courseId,
          lessonId: lessonId || undefined,
        }}
        onAccept={(text, aiForm) => {
          const words = text ? text.trim().split(/\s+/).length : 0;
          const estimatedMinutes = Math.max(5, Math.min(60, Math.ceil(words / 150) * 5));
          setForm((prev) => ({
            ...prev,
            content: text,
            title: prev.title?.trim() ? prev.title : (aiForm?.topic?.trim() || prev.title),
            durationMinutes: (!prev.durationMinutes || prev.durationMinutes === 10) && estimatedMinutes > 0 ? estimatedMinutes : prev.durationMinutes,
          }));
          setErrors((e) => ({ ...e, content: undefined, title: undefined, durationMinutes: undefined }));
          message.success("Đã áp dụng nội dung bài học từ AI");
        }}
        onClose={() => setAiOpen(false)}
      />
    </>
  );
}
