import React from "react";
import { Input, InputNumber, Button, Select, Upload } from "antd";
import { Sparkles, UploadIcon } from "lucide-react";
import { Field } from "./shared";

/** Form fields for create/edit course (title, description, category, cover, context, level, price, status). */
export function CourseFormFields({
  form,
  set,
  errors,
  uploading,
  onPickThumb,
  onOpenAi,
}) {
  return (
    <>
      <div className="form-grid">
        <Field
          label="Tên khóa học"
          required
          error={errors.title}
          hint={`${form.title.trim().length}/100 ký tự`}
        >
          <Input
            maxLength={100}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ví dụ: Java căn bản cho người mới"
          />
        </Field>
        <Field label="Danh mục" error={errors.category}>
          <Input
            maxLength={100}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Lập trình, Thiết kế, Kinh doanh…"
          />
        </Field>
      </div>

      <Field
        label="Mô tả"
        required
        error={errors.description}
        hint={`${form.description.trim().length}/2.000 ký tự (tối thiểu 10)`}
      >
        <Input.TextArea
          rows={6}
          maxLength={2000}
          showCount
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Khóa học này giúp học viên đạt được điều gì?"
        />
      </Field>

      <div className="ai-row">
        <Button
          icon={<Sparkles size={16} />}
          onClick={onOpenAi}
          disabled={uploading}
        >
          Generate with AI
        </Button>
        <span className="hint">
          Nội dung AI chỉ được điền vào Mô tả khi bạn bấm Accept.
        </span>
      </div>

      <Field
        label="Ngữ cảnh cho AI (không bắt buộc)"
        error={errors.context}
        hint="Đối tượng học, công cụ, phạm vi, yêu cầu riêng… AI dùng ngữ cảnh này để viết đúng khóa học. Tối đa 2.000 ký tự."
      >
        <Input.TextArea
          rows={4}
          maxLength={2000}
          showCount
          value={form.context || ""}
          onChange={(e) => set("context", e.target.value)}
          placeholder="Ví dụ: Sinh viên năm 2 ngành CNTT đã biết Java cơ bản; dùng Spring Boot 3, MySQL 8; không dạy lại cú pháp Java."
        />
      </Field>

      <div className="form-grid">
        <Field label="Level" required error={errors.level}>
          <Select value={form.level} onChange={(v) => set("level", v)} options={[
            { value: "BEGINNER", label: "Beginner" },
            { value: "INTERMEDIATE", label: "Intermediate" },
            { value: "ADVANCED", label: "Advanced" },
          ]} />
        </Field>
        <Field
          label="Price (VND)"
          required
          error={errors.price}
          hint="0 = miễn phí"
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            max={100000000}
            step={10000}
            value={form.price}
            onChange={(v) => set("price", v ?? 0)}
            formatter={(v) =>
              v !== undefined && v !== null && v !== ""
                ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                : ""
            }
            parser={(v) => (v ? v.replace(/\./g, "").replace(/[^\d]/g, "") : "")}
            addonAfter="₫"
          />
        </Field>
      </div>

      <div className="form-grid">
        <Field label="Thumbnail (JPG/PNG, tối đa 2 MB)" error={errors.cover}>
          <div className="upload-line">
            <Upload
              accept="image/png,image/jpeg"
              maxCount={1}
              showUploadList={false}
              beforeUpload={onPickThumb}
            >
              <Button icon={<UploadIcon size={16} />} loading={uploading}>
                {form.cover ? "Đổi ảnh bìa" : "Tải ảnh bìa"}
              </Button>
            </Upload>
            {form.cover && (
              <>
                <img className="thumb-preview" src={form.cover} alt="Ảnh bìa" />
                <Button type="text" size="small" onClick={() => set("cover", "")}>
                  Bỏ ảnh
                </Button>
              </>
            )}
          </div>
        </Field>
        <Field label="Status" required error={errors.status}>
          <Select value={form.status} onChange={(v) => set("status", v)} options={[
            { value: "DRAFT", label: "Draft" },
            { value: "PUBLISHED", label: "Published" },
          ]} />
        </Field>
      </div>
    </>
  );
}
