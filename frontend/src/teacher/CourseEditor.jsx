import React, { useEffect, useState } from "react";
import { Button, message } from "antd";
import { Save } from "lucide-react";
import { api, post, put, upload } from "../api";
import { Crumb, errorsOf } from "./shared";
import { CourseFormFields } from "./CourseFormFields";
import { AiDialog } from "./AiDialog";

export function CourseEditor({ courseId, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "BEGINNER",
    price: 0,
    status: "DRAFT",
    category: "",
    cover: "",
    context: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    let alive = true;
    api(`/teacher/courses/${courseId}`).then((r) => {
      if (!alive) return;
      setForm({
        title: r.title || "",
        description: r.description || "",
        level: r.level || "BEGINNER",
        price: Number(r.price || 0),
        status: r.status || "DRAFT",
        category: r.category || "",
        cover: r.cover || "",
        context: r.context || "",
      });
    }).catch((e) => message.error(e.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [courseId]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    const title = form.title.trim();
    const desc = form.description.trim();
    if (title.length < 5 || title.length > 100) e.title = "Tên khóa học phải từ 5 đến 100 ký tự";
    if (desc.length < 10 || desc.length > 2000) e.description = "Mô tả phải từ 10 đến 2.000 ký tự";
    if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(form.level)) e.level = "Vui lòng chọn cấp độ";
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0 || price > 100000000) e.price = "Giá phải từ 0 đến 100.000.000 ₫";
    if (!["DRAFT", "PUBLISHED"].includes(form.status)) e.status = "Vui lòng chọn trạng thái";
    if ((form.context || "").trim().length > 2000) e.context = "Ngữ cảnh tối đa 2.000 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), description: form.description.trim() };
      const r = courseId ? await put(`/teacher/courses/${courseId}`, payload) : await post("/teacher/courses", payload);
      message.success("Đã lưu khóa học thành công");
      onSaved(r.id);
    } catch (e) {
      const fields = errorsOf(e);
      if (fields) setErrors(fields);
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const pickThumb = async (file) => {
    setErrors((e) => ({ ...e, cover: undefined }));
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((e) => ({ ...e, cover: "Ảnh bìa phải là JPG hoặc PNG" }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((e) => ({ ...e, cover: "Ảnh bìa tối đa 2 MB" }));
      return;
    }
    setUploading(true);
    try {
      const r = await upload("/teacher/uploads", file, "thumbnail");
      set("cover", r.url);
      message.success("Đã tải ảnh bìa");
    } catch (e) {
      const fields = errorsOf(e);
      if (fields) setErrors(fields);
      else message.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Crumb items={[
        { label: "Khóa học", onClick: onCancel },
        { label: courseId ? form.title || "Chỉnh sửa" : "Tạo khóa học", onClick: onCancel },
      ]} />
      <div className="page-title">
        <span className="kicker">BIÊN TẬP KHÓA HỌC</span>
        <h1>{courseId ? "Chỉnh sửa khóa học" : "Tạo khóa học mới"}</h1>
      </div>

      <div
        className="panel"
        data-testid="course-form"
        style={{ opacity: loading ? 0.5 : 1 }}
      >
        <CourseFormFields
          form={form}
          set={set}
          errors={errors}
          uploading={uploading}
          onPickThumb={pickThumb}
          onOpenAi={() => setAiOpen(true)}
        />
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
          Lưu khóa học
        </Button>
        <Button size="large" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
      </div>

      <AiDialog
        open={aiOpen}
        defaultContentType="COURSE_DESCRIPTION"
        defaults={{ topic: form.title, level: form.level, context: form.context, courseId: courseId || undefined }}
        onAccept={(text, aiForm) => {
          setForm((prev) => {
            const next = { ...prev, description: text };
            if (!prev.title?.trim() && aiForm?.topic?.trim()) {
              next.title = aiForm.topic.trim();
            }
            if (aiForm?.level) {
              next.level = aiForm.level;
            }
            if (!prev.context?.trim() && aiForm?.context?.trim()) {
              next.context = aiForm.context.trim();
            }
            if (!prev.category?.trim()) {
              next.category = "Công nghệ thông tin";
            }
            return next;
          });
          setErrors((e) => ({
            ...e,
            description: undefined,
            title: undefined,
            level: undefined,
            category: undefined,
          }));
          message.success("Đã áp dụng nội dung AI và tự động điền các trường");
        }}
        onClose={() => setAiOpen(false)}
      />
    </>
  );
}
