import React, { useEffect, useState } from "react";
import { Modal, message } from "antd";
import { api, post } from "../api";
import { Crumb, errorsOf } from "./shared";
import { QuestionCriteriaPanel } from "./QuestionCriteriaPanel";
import { QuestionDraftList } from "./QuestionDraftList";

export function QuestionAiStudio({ initialSubject = "", onSaved, onCancel }) {
  const [form, setForm] = useState({
    subject: initialSubject,
    topic: "",
    questionType: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    quantity: 5,
    instructions: "",
    language: "VIETNAMESE",
    context: "",
    lessonId: null,
  });
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [courseId, setCourseId] = useState(null);
  const [moduleId, setModuleId] = useState(null);
  const [errors, setErrors] = useState({});
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/teacher/courses?page=0&size=50&status=ALL")
      .then((r) => setCourses(r.items || []))
      .catch((e) => message.error(e.message));
  }, []);

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const chooseCourse = async (value) => {
    setCourseId(value);
    setModuleId(null);
    setModules([]);
    setLessons([]);
    set("lessonId", null);
    if (!value) return;
    try {
      const result = await api(`/teacher/courses/${value}/modules`);
      setModules(result.modules || []);
    } catch (e) {
      message.error(e.message);
    }
  };

  const chooseModule = async (value) => {
    setModuleId(value);
    setLessons([]);
    set("lessonId", null);
    if (!value) return;
    try {
      const result = await api(`/teacher/modules/${value}/lessons`);
      setLessons(result.lessons || []);
    } catch (e) {
      message.error(e.message);
    }
  };

  const useLesson = () => {
    const lesson = lessons.find((item) => item.id === form.lessonId);
    if (!lesson) return;
    if (lesson.contentType !== "TEXT") {
      setErrors((current) => ({
        ...current,
        lessonId:
          "Bài Video/File chưa hỗ trợ trích xuất. Hãy dán transcript hoặc nội dung tài liệu vào editor.",
      }));
      return;
    }
    const apply = () => {
      set("context", lesson.content || "");
      if (!form.topic.trim()) set("topic", lesson.title || "");
      message.success(
        "Đã đưa nội dung bài học vào ngữ cảnh. Bạn có thể chỉnh sửa trước khi tạo.",
      );
    };
    if (form.context.trim()) {
      Modal.confirm({
        title: "Thay nội dung ngữ cảnh hiện tại?",
        content: "Nội dung trong editor sẽ được thay bằng bài học đã chọn.",
        okText: "Thay nội dung",
        cancelText: "Giữ nguyên",
        onOk: apply,
      });
    } else apply();
  };

  const validate = () => {
    const next = {};
    if (!form.subject.trim() || form.subject.trim().length > 100)
      next.subject = "Môn học là bắt buộc, tối đa 100 ký tự";
    if (form.topic.trim().length < 3 || form.topic.trim().length > 255)
      next.topic = "Chủ đề phải từ 3 đến 255 ký tự";
    if (form.quantity < 1 || form.quantity > 20)
      next.quantity = "Số câu hỏi phải từ 1 đến 20";
    if (form.instructions.trim().length > 1000)
      next.instructions = "Yêu cầu bổ sung tối đa 1.000 ký tự";
    if (!form.context.trim())
      next.context = "Hãy dán nội dung đã dạy hoặc lấy nội dung từ một bài học Text";
    else if (form.context.trim().length > 20000)
      next.context = "Nội dung bài học tối đa 20.000 ký tự";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const runGenerate = async () => {
    if (!validate() || generating) return;
    setGenerating(true);
    setErrors({});
    try {
      const result = await post("/questions/generate", {
        ...form,
        subject: form.subject.trim(),
        topic: form.topic.trim(),
        instructions: form.instructions.trim(),
        context: form.context.trim(),
      });
      setDrafts(result);
      setSelected([]);
      message.success(`Đã tạo ${result.length} bản nháp để bạn duyệt`);
    } catch (e) {
      const fields = errorsOf(e);
      if (fields) setErrors(fields);
      message.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const requestGenerate = () => {
    if (!drafts.length) return runGenerate();
    Modal.confirm({
      title: "Tạo lại và thay bản nháp hiện tại?",
      content: "Các chỉnh sửa chưa lưu trong danh sách bản nháp sẽ bị thay thế.",
      okText: "Tạo lại",
      cancelText: "Tiếp tục duyệt",
      // Không trả promise để modal đóng ngay, phần tạo lại chạy tiếp phía sau.
      onOk: () => {
        runGenerate();
      },
    });
  };

  const updateDraft = (index, update) =>
    setDrafts((current) =>
      current.map((draft, currentIndex) =>
        currentIndex === index ? { ...draft, ...update } : draft,
      ),
    );

  const selectDraft = (index, checked) =>
    setSelected((current) =>
      checked ? [...current, index] : current.filter((item) => item !== index),
    );

  const selectAllDrafts = (checked) =>
    setSelected(checked ? drafts.map((_, index) => index) : []);

  const saveSelected = async () => {
    if (!selected.length || saving) return;
    setSaving(true);
    try {
      const payload = selected.map((index) => ({
        subject: drafts[index].subject || form.subject,
        content: drafts[index].content,
        difficulty: drafts[index].difficulty || form.difficulty,
        explanation: drafts[index].explanation || "",
        answers: drafts[index].answers,
      }));
      await post("/questions/bulk", payload);
      const kept = drafts.filter((_, index) => !selected.includes(index));
      setDrafts(kept);
      setSelected([]);
      message.success(`Đã lưu ${payload.length} câu hỏi vào ngân hàng`);
      onSaved?.();
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const discardAll = () =>
    Modal.confirm({
      title: "Bỏ toàn bộ bản nháp?",
      content: "Tiêu chí và nội dung bài học vẫn được giữ để bạn tạo lại.",
      okText: "Bỏ bản nháp",
      okButtonProps: { danger: true },
      onOk: () => {
        setDrafts([]);
        setSelected([]);
      },
    });

  const leave = () => {
    if (!drafts.length) return onCancel();
    Modal.confirm({
      title: "Rời trang và bỏ bản nháp?",
      content: "Những câu hỏi chưa lưu sẽ không được thêm vào ngân hàng.",
      okText: "Rời trang",
      cancelText: "Ở lại",
      onOk: onCancel,
    });
  };

  return (
    <>
      <Crumb
        items={[
          { label: "Ngân hàng câu hỏi", onClick: leave },
          { label: "Tạo bằng AI" },
        ]}
      />
      <div className="page-title question-ai-title">
        <span className="kicker">TRỢ LÝ SOẠN CÂU HỎI</span>
        <h1>Tạo câu hỏi bám sát bài học</h1>
        <p>
          AI dùng nội dung bạn cung cấp làm nguồn kiến thức; mọi câu hỏi vẫn cần
          được giáo viên duyệt trước khi lưu.
        </p>
      </div>

      <div className="question-ai-layout">
        <QuestionCriteriaPanel
          form={form}
          set={set}
          errors={errors}
          courses={courses}
          modules={modules}
          lessons={lessons}
          courseId={courseId}
          moduleId={moduleId}
          onChooseCourse={chooseCourse}
          onChooseModule={chooseModule}
          onUseLesson={useLesson}
          generating={generating}
          draftCount={drafts.length}
          onGenerate={requestGenerate}
        />
        <QuestionDraftList
          drafts={drafts}
          selected={selected}
          onSelect={selectDraft}
          onSelectAll={selectAllDrafts}
          onUpdateDraft={updateDraft}
          onDiscardAll={discardAll}
          onLeave={leave}
          onSave={saveSelected}
          saving={saving}
        />
      </div>
    </>
  );
}
