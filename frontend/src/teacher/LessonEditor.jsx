import React, { useEffect, useState } from "react";
import { Button, Input, InputNumber, Modal, Select, Upload, message } from "antd";
import { Save, Trash2 } from "lucide-react";
import { api, del, post, put, upload } from "../api";
import { AiDialog } from "./AiDialog";
import { Crumb, Field, TYPES, errorsOf } from "./shared";
import { LessonBodyFields } from "./LessonBodyFields";

export function LessonEditor({ courseId, moduleId, lessonId, onDone, onCancel }) {
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState({
    moduleId: moduleId || null,
    title: "",
    contentType: "TEXT",
    content: "",
    videoUrl: "",
    durationMinutes: null,
    position: 1,
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
        const detail = await api(`/teacher/courses/${courseId}`);
        if (!alive) return;
        setCourse(detail);
        const mods = (detail.content || []).map((x) => x.module);
        setModules(mods);
        const current = mods.find((m) => m.id === moduleId);
        if (lessonId) {
          const list = await api(`/teacher/modules/${moduleId}/lessons`);
          const l = (list.lessons || []).find((x) => x.id === lessonId);
          if (l) {
            if (!alive) return;
            setForm({
              moduleId: l.moduleId,
              title: l.title || "",
              contentType: l.contentType || "TEXT",
              content: l.content || "",
              videoUrl: l.videoUrl || "",
              durationMinutes: l.durationMinutes ?? null,
              position: l.position || 1,
              fileUrl: l.fileUrl || "",
              fileName: l.fileName || "",
            });
          }
        } else {
          const count = current?.lessonCount || 0;
          setForm((f) => ({ ...f, position: count + 1, moduleId }));
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
    if (!form.moduleId) e.moduleId = "Vui lòng chọn module";
    const t = form.title.trim();
    if (t.length < 3 || t.length > 150)
      e.title = "Tiêu đề bài học phải từ 3 đến 150 ký tự";
    if (!form.contentType) e.contentType = "Vui lòng chọn loại nội dung";
    if (
      form.durationMinutes !== null &&
      form.durationMinutes !== undefined &&
      (form.durationMinutes < 1 || form.durationMinutes > 600)
    )
      e.durationMinutes = "Thời lượng phải từ 1 đến 600 phút";
    if (!Number.isInteger(Number(form.position)) || Number(form.position) < 1)
      e.position = "Thứ tự phải là số nguyên từ 1";
    if (form.contentType === "TEXT") {
      const c = form.content.trim();
      if (c.length < 10 || c.length > 10000)
        e.content = "Nội dung phải từ 10 đến 10.000 ký tự";
    }
    if (form.contentType === "VIDEO") {
      if (!form.videoUrl.trim()) e.videoUrl = "Vui lòng nhập URL video";
      else if (!/^https?:\/\/\S+$/.test(form.videoUrl.trim()))
        e.videoUrl = "URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)";
    }
    if (form.contentType === "FILE" && !form.fileUrl)
      e.fileUrl = "Vui lòng tải lên tệp bài học";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const payload = {
        moduleId: form.moduleId,
        title: form.title.trim(),
        contentType: form.contentType,
        content: form.contentType === "TEXT" ? form.content : "",
        videoUrl: form.contentType === "VIDEO" ? form.videoUrl.trim() : "",
        durationMinutes: form.durationMinutes ?? null,
        position: Number(form.position),
        fileUrl: form.contentType === "FILE" ? form.fileUrl : null,
        fileName: form.contentType === "FILE" ? form.fileName : null,
      };
      if (lessonId) await put(`/teacher/lessons/${lessonId}`, payload);
      else await post(`/teacher/modules/${form.moduleId}/lessons`, payload);
      message.success("Đã lưu bài học thành công");
      onDone(form.moduleId);
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
      setErrors((e) => ({ ...e, fileUrl: "Tệp tối đa 25 MB" }));
      return Upload.LIST_IGNORE;
    }
    setUploading(true);
    try {
      const r = await upload("/teacher/uploads", file, "lesson-file");
      setForm((f) => ({ ...f, fileUrl: r.url, fileName: r.name }));
      message.success("Đã tải tệp bài học");
    } catch (e) {
      const fields = errorsOf(e);
      if (fields) setErrors(fields);
      else message.error(e.message);
    } finally {
      setUploading(false);
    }
    return Upload.LIST_IGNORE;
  };

  const remove = () =>
    Modal.confirm({
      title: "Xóa bài học?",
      content: `Bài học "${form.title}" sẽ bị xóa vĩnh viễn.`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await del(`/teacher/lessons/${lessonId}`);
          message.success("Đã xóa bài học");
          onDone(form.moduleId);
        } catch (e) {
          message.error(e.message);
          throw e;
        }
      },
    });

  const crumbs = [
    { label: "Khóa học", onClick: onCancel },
    { label: course?.title || "Khóa học", onClick: onCancel },
    {
      label: modules.find((m) => m.id === form.moduleId)?.title || "Module",
      onClick: onCancel,
    },
    { label: lessonId ? "Bài học" : "Thêm bài học" },
  ];

  return (
    <>
      <Crumb items={crumbs} />
      <div className="page-title">
        <span className="kicker">LESSON EDITOR</span>
        <h1>{lessonId ? "Chỉnh sửa bài học" : "Thêm bài học"}</h1>
      </div>

      <div className="panel" style={{ opacity: loading ? 0.5 : 1 }}>
        <div className="form-grid">
          <Field label="Module" required error={errors.moduleId}>
            <Select
              value={form.moduleId}
              onChange={(v) => set("moduleId", v)}
              placeholder="Chọn module"
              options={modules.map((m) => ({ value: m.id, label: m.title }))}
            />
          </Field>
          <Field
            label="Tiêu đề bài học"
            required
            error={errors.title}
            hint={`${form.title.trim().length}/150 ký tự`}
          >
            <Input
              maxLength={150}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
        </div>

        <div className="form-grid">
          <Field label="Content type" required error={errors.contentType}>
            <Select
              value={form.contentType}
              onChange={(v) => set("contentType", v)}
              options={TYPES}
            />
          </Field>
          <Field
            label="Duration (minutes)"
            error={errors.durationMinutes}
            hint="Không bắt buộc · 1–600"
          >
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              max={600}
              value={form.durationMinutes}
              onChange={(v) => set("durationMinutes", v ?? null)}
              placeholder="Ví dụ: 25"
            />
          </Field>
        </div>

        <Field
          label="Order"
          required
          error={errors.position}
          hint="Tạo mới sẽ mặc định ở vị trí cuối module."
        >
          <InputNumber
            style={{ width: 180 }}
            min={1}
            value={form.position}
            onChange={(v) => set("position", v ?? 1)}
          />
        </Field>

        <LessonBodyFields
          form={form}
          errors={errors}
          saving={saving}
          uploading={uploading}
          hasExistingFile={!!lessonId}
          onChange={set}
          onPickFile={pickFile}
          onOpenAi={() => setAiOpen(true)}
        />

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
        onAccept={(text) => {
          set("content", text);
          message.success("Đã áp dụng nội dung AI");
        }}
        onClose={() => setAiOpen(false)}
      />
    </>
  );
}
