import React from "react";
import { Button, Input, Upload } from "antd";
import { FileText, Sparkles, Upload as UploadIcon } from "lucide-react";
import { Field } from "./shared";

/** Body fields that change with the lesson content type (Text/Video/File). */
export function LessonBodyFields({
  form,
  errors,
  saving,
  uploading,
  hasExistingFile,
  onChange,
  onPickFile,
  onOpenAi,
}) {
  return (
    <>
      {form.contentType === "TEXT" && (
        <>
          <Field
            label="Lesson content"
            required
            error={errors.content}
            hint={`${form.content.trim().length}/10.000 ký tự (tối thiểu 10)`}
          >
            <Input.TextArea
              rows={12}
              maxLength={10000}
              showCount
              value={form.content}
              onChange={(e) => onChange("content", e.target.value)}
              placeholder="Nội dung bài học dạng văn bản…"
            />
          </Field>
          <div className="ai-row">
            <Button
              icon={<Sparkles size={16} />}
              onClick={onOpenAi}
              disabled={saving}
            >
              Generate with AI
            </Button>
            <span className="hint">
              Chỉ dùng cho bài học Text. AI điền vào nội dung, bạn vẫn phải bấm
              Save.
            </span>
          </div>
        </>
      )}

      {form.contentType === "VIDEO" && (
        <Field
          label="Video URL"
          required
          error={errors.videoUrl}
          hint="Phải là liên kết http(s) hợp lệ."
        >
          <Input
            value={form.videoUrl}
            onChange={(e) => onChange("videoUrl", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </Field>
      )}

      {form.contentType === "FILE" && (
        <Field
          label="Tệp bài học"
          required
          error={errors.fileUrl}
          hint="Tối đa 25 MB · PDF, Office, văn bản, nén hoặc media."
        >
          <div className="upload-line">
            <Upload
              showUploadList={false}
              beforeUpload={onPickFile}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.zip,.mp4,.mp3,.png,.jpg,.jpeg,.webp"
            >
              <Button icon={<UploadIcon size={16} />} loading={uploading}>
                {form.fileUrl ? "Thay tệp khác" : "Tải tệp lên"}
              </Button>
            </Upload>
            {form.fileUrl && (
              <>
                <a
                  className="file-chip"
                  href={form.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText size={14} /> {form.fileName || "Tệp đã tải"}
                </a>
                {hasExistingFile && (
                  <span className="hint">
                    Giữ tệp hiện tại nếu không chọn tệp mới.
                  </span>
                )}
              </>
            )}
          </div>
        </Field>
      )}
    </>
  );
}
