import React from "react";
import { Button, Input, Modal } from "antd";
import { Layers, Save, Sparkles } from "lucide-react";
import { Field } from "./shared";

/** Create/edit popup modal for a module. */
export function ModuleFormPanel({
  open,
  draft,
  errors,
  saving,
  onChange,
  onSave,
  onClose,
  onOpenAi,
}) {
  return (
    <Modal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Layers size={18} color="#6366f1" />
          <span style={{ fontFamily: "var(--display)", fontSize: 17, fontWeight: 700 }}>
            {draft.id ? "Chỉnh sửa module" : "Thêm module mới"}
          </span>
        </div>
      }
      onCancel={onClose}
      width={640}
      maskClosable={false}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>
          Hủy
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<Save size={16} />}
          loading={saving}
          disabled={saving}
          onClick={onSave}
        >
          {draft.id ? "Lưu thay đổi" : "Thêm module"}
        </Button>,
      ]}
    >
      <div style={{ marginTop: 12 }}>
        <Field
          label="Tên module"
          required
          error={errors.title}
          hint={`${draft.title.trim().length}/100 ký tự`}
        >
          <Input
            size="large"
            maxLength={100}
            value={draft.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="Ví dụ: Chương I: Cài đặt và Kiến trúc cơ bản"
          />
        </Field>

        <Field
          label="Mô tả module (không bắt buộc)"
          error={errors.description}
          hint={`${draft.description.trim().length}/500 ký tự`}
        >
          <Input.TextArea
            rows={3}
            maxLength={500}
            value={draft.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Mục tiêu và kiến thức cốt lõi của module này"
          />
        </Field>

        <div className="ai-row" style={{ marginTop: 8, marginBottom: 4 }}>
          <Button icon={<Sparkles size={16} />} onClick={onOpenAi}>
            Generate with AI
          </Button>
          <span className="hint" style={{ fontSize: 12 }}>
            Nội dung AI sẽ được điền vào Mô tả module khi bạn bấm Accept.
          </span>
        </div>
      </div>
    </Modal>
  );
}
