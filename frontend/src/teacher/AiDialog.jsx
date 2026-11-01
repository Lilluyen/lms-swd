import React, { useEffect, useState } from "react";
import { post } from "../api";
import { errorsOf } from "./shared";
import { AiDialogContent } from "./AiDialogContent";

export function AiDialog({
  open,
  defaultContentType = "COURSE_DESCRIPTION",
  defaults = {},
  onAccept,
  onClose,
}) {
  const [form, setForm] = useState({
    topic: "",
    objective: "",
    context: "",
    level: "BEGINNER",
    contentType: defaultContentType,
    language: "ENGLISH",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: "READY", message: "" });
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      topic: (defaults.topic || "").slice(0, 200),
      objective: "",
      context: defaults.context || "",
      level: defaults.level || "BEGINNER",
      contentType: defaultContentType,
      language: "ENGLISH",
    });
    setErrors({});
    setStatus({ state: "READY", message: "" });
    setResult(null);
    setEditing(false);
  }, [open, defaultContentType, defaults.topic, defaults.level, defaults.context]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (form.topic.trim().length < 3 || form.topic.trim().length > 200) e.topic = "Chủ đề phải từ 3 đến 200 ký tự";
    if (form.objective.trim().length > 500) e.objective = "Mục tiêu học tập tối đa 500 ký tự";
    if (form.context.trim().length > 20000) e.context = "Ngữ cảnh / nội dung tham khảo tối đa 20.000 ký tự";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generate = async () => {
    if (status.state === "LOADING" || !validate()) return;
    setStatus({ state: "LOADING", message: "" });
    setResult(null);
    setEditing(false);
    try {
      const r = await post("/teacher/ai/generate", {
        ...form,
        topic: form.topic.trim(),
        objective: form.objective.trim(),
        context: form.context.trim(),
        courseId: defaults.courseId,
        lessonId: defaults.lessonId,
      });
      setResult({ ...r, text: r.text });
      setStatus({
        state: "READY",
        message: r.withinLimit
          ? `${r.charCount.toLocaleString("vi-VN")} ký tự · trong giới hạn ${r.maxLength.toLocaleString("vi-VN")}`
          : r.warning,
      });
    } catch (err) {
      const fields = errorsOf(err);
      if (fields) setErrors(fields);
      setStatus({ state: "ERROR", message: err.message });
    }
  };

  const length = result?.text?.length ?? 0;
  const contentType = form.contentType;
  const min = result?.minLength ?? (contentType === "COURSE_DESCRIPTION" ? 10 : 10);
  const max = result?.maxLength ?? (contentType === "COURSE_DESCRIPTION" ? 2000 : 10000);
  const within = !!result && length >= min && length <= max;

  const accept = () => {
    if (!result || !within) return;
    const destination = form.contentType === "COURSE_DESCRIPTION" ? "Mô tả khóa học" : "Nội dung bài học";
    onAccept(result.text);
    setResult(null);
    setEditing(false);
    setStatus({ state: "READY", message: `Đã áp dụng vào ${destination}` });
    onClose();
  };

  const reject = () => {
    setResult(null);
    setEditing(false);
    setStatus({ state: "READY", message: "Đã bỏ kết quả. Điều chỉnh yêu cầu rồi tạo lại." });
  };

  const close = () => {
    setResult(null);
    setEditing(false);
    onClose();
  };

  return <AiDialogContent
    open={open}
    form={form}
    set={set}
    errors={errors}
    status={status}
    result={result}
    setResult={setResult}
    editing={editing}
    min={min}
    max={max}
    within={within}
    onAccept={accept}
    onReject={reject}
    onEdit={setEditing}
    onFinishEdit={() => setEditing(false)}
    onClose={close}
    generate={generate}
  />;
}
