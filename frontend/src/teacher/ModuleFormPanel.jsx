import React from "react";
import { Button, Input } from "antd";
import { Save, X } from "lucide-react";
import { Field } from "./shared";

/** Create/edit form for a module. */
export function ModuleFormPanel({
  formRef,
  draft,
  errors,
  saving,
  onChange,
  onSave,
  onReset,
}) {
  return (
    <div className="panel" ref={formRef} style={{ marginTop: 20 }}>
      <div className="panel-head">
        <div>
          <span className="kicker">{draft.id ? "CHỈNH SỬA" : "THÊM MỚI"}</span>
          <h2 style={{ margin: "6px 0 0" }}>
            {draft.id ? "Chỉnh sửa module" : "Thêm module"}
          </h2>
        </div>
        {draft.id && (
          <Button onClick={onReset} icon={<X size={15} />}>
            Thoát chỉnh sửa
          </Button>
        )}
      </div>
      <div className="form-grid">
        <Field
          label="Tên module"
          required
          error={errors.title}
          hint={`${draft.title.trim().length}/100 ký tự`}
        >
          <Input
            maxLength={100}
            value={draft.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Ví dụ: Bắt đầu hành trình"
          />
        </Field>
        <Field
          label="Mô tả (không bắt buộc)"
          error={errors.description}
          hint={`${draft.description.trim().length}/500 ký tự`}
        >
          <Input
            maxLength={500}
            value={draft.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Mục tiêu của module này"
          />
        </Field>
      </div>
      <div className="form-actions">
        <Button
          type="primary"
          size="large"
          icon={<Save size={16} />}
          loading={saving}
          disabled={saving}
          onClick={onSave}
        >
          {draft.id ? "Lưu module" : "Thêm module"}
        </Button>
        <Button size="large" onClick={onReset} disabled={saving}>
          Hủy
        </Button>
      </div>
    </div>
  );
}
