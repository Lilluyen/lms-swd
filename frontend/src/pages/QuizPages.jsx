import React from "react";
import { Button, Modal, Space } from "antd";
import {
  ArrowRight,
  BrainCircuit,
  Clock,
  Plus,
  Sparkles,
} from "lucide-react";
import { Empty, Field, PageTitle } from "../components/common";

export function QuizzesPage({
  quizzes,
  teacher,
  setPage,
  setForm,
  beginQuiz,
  editQuiz,
  deleteQuiz,
}) {
  return (
    <>
      <PageTitle
        kicker="LUYỆN TẬP"
        title="Quiz luyện tập"
        desc="Kiểm tra kiến thức và theo dõi sự tiến bộ của bạn."
      />
      <div className="actions">
        {teacher ? (
          <button
            className="primary"
            onClick={() => {
              setForm({
                title: "",
                subject: "",
                durationMinutes: 20,
                questionIds: [],
              });
              setPage("edit-quiz");
            }}
          >
            <Plus size={17} /> Tạo quiz từ ngân hàng
          </button>
        ) : (
          <button
            className="primary"
            onClick={() => {
              setForm({
                subject: "",
                topic: "",
                difficulty: "MEDIUM",
                quantity: 5,
              });
              setPage("practice-ai");
            }}
          >
            <Sparkles size={17} /> Tạo quiz bằng AI
          </button>
        )}
      </div>
      <div className="quiz-grid">
        {quizzes.map((q) => (
          <div className="quiz-card" key={q.id}>
            <div className="quiz-icon">
              <BrainCircuit size={26} />
            </div>
            <span className="kicker">{q.subject || "LUYỆN TẬP"}</span>
            <h3>{q.title}</h3>
            <p>
              <Clock size={15} /> {q.durationMinutes} phút
            </p>
            {teacher && (
              <Space>
                <Button onClick={() => editQuiz(q)}>Sửa</Button>
                <Button danger onClick={() => deleteQuiz(q)}>
                  Xóa
                </Button>
              </Space>
            )}
            {!teacher && (
              <button className="outline" onClick={() => beginQuiz(q)}>
                Làm bài <ArrowRight size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {!quizzes.length && (
        <Empty text="Chưa có quiz. Hãy tạo quiz đầu tiên." />
      )}
    </>
  );
}

export function QuizEditorPage({
  teacher,
  form,
  setForm,
  questions,
  saveQuiz,
}) {
  return (
    <>
      <PageTitle kicker="LUYỆN TẬP" title="Tạo quiz mới" />
      <div className="editor">
        <Field
          label="Tiêu đề"
          value={form.title}
          set={(v) => setForm({ ...form, title: v })}
        />
        <Field
          label="Môn học"
          value={form.subject}
          set={(v) => setForm({ ...form, subject: v })}
        />
        <Field
          label="Thời gian (phút)"
          type="number"
          value={form.durationMinutes}
          set={(v) => setForm({ ...form, durationMinutes: Number(v) })}
        />
        {teacher ? (
          <>
            <label>Chọn câu hỏi từ ngân hàng</label>
            {questions.map((x) => (
              <label className="check" key={x.question.id}>
                <input
                  type="checkbox"
                  checked={form.questionIds?.includes(x.question.id)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      questionIds: e.target.checked
                        ? [...form.questionIds, x.question.id]
                        : form.questionIds.filter((v) => v !== x.question.id),
                    })
                  }
                />
                {x.question.content}
              </label>
            ))}
          </>
        ) : (
          <p className="muted">
            Giáo viên tạo câu hỏi và gán vào quiz. Học viên có thể tạo quiz nháp
            cá nhân; cần câu hỏi để làm bài.
          </p>
        )}
        <button className="primary" onClick={saveQuiz}>
          Lưu quiz
        </button>
      </div>
    </>
  );
}

export function PracticeAiPage({ form, setForm, busy, generatePractice }) {
  return (
    <>
      <PageTitle
        kicker="GEMINI AI"
        title="Tạo quiz luyện tập"
        desc="Chọn môn và chủ đề để tạo bài luyện tập cá nhân."
      />
      <div className="editor">
        <Field
          label="Môn học"
          value={form.subject}
          set={(v) => setForm({ ...form, subject: v })}
        />
        <Field
          label="Chủ đề"
          value={form.topic}
          set={(v) => setForm({ ...form, topic: v })}
        />
        <label>Độ khó</label>
        <select
          value={form.difficulty}
          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
        >
          <option value="EASY">Dễ</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HARD">Khó</option>
        </select>
        <Field
          label="Số câu hỏi (1–10)"
          type="number"
          value={form.quantity}
          set={(v) => setForm({ ...form, quantity: Number(v) })}
        />
        <button
          className="primary"
          disabled={busy}
          onClick={() => generatePractice(form)}
        >
          <Sparkles size={17} /> Tạo và bắt đầu
        </button>
      </div>
    </>
  );
}

export function TakeQuizPage({
  quizData,
  choices,
  setChoices,
  remaining,
  busy,
  submitQuiz,
}) {
  return (
    <>
      <div className="quiz-timer">
        <Clock size={18} /> {Math.floor((remaining || 0) / 60)}:
        {String((remaining || 0) % 60).padStart(2, "0")}{" "}
        <span>
          {Object.keys(choices).length}/{quizData.questions.length} đã trả lời
        </span>
      </div>
      <PageTitle
        kicker="QUIZ LUYỆN TẬP"
        title={quizData.quiz.title}
        desc={`${quizData.questions.length} câu hỏi · ${quizData.quiz.durationMinutes} phút`}
      />
      {quizData.questions.map((q, i) => (
        <div className="take-card" key={q.id}>
          <span className="kicker">
            CÂU HỎI {String(i + 1).padStart(2, "0")}
          </span>
          <h3>{q.content}</h3>
          {q.answers.map((a) => (
            <label
              key={a.id}
              className={
                "choice " + (choices[q.id] === a.id ? "selected" : "")
              }
            >
              <input
                type="radio"
                name={"q" + q.id}
                checked={choices[q.id] === a.id}
                onChange={() => setChoices({ ...choices, [q.id]: a.id })}
              />
              {a.content}
            </label>
          ))}
        </div>
      ))}
      <button
        className="primary"
        disabled={busy}
        onClick={() =>
          Modal.confirm({
            title: "Nộp bài luyện tập?",
            content: `Đã trả lời ${Object.keys(choices).length}/${quizData.questions.length} câu.`,
            okText: "Nộp bài",
            cancelText: "Tiếp tục làm",
            onOk: submitQuiz,
          })
        }
      >
        Nộp bài <ArrowRight size={16} />
      </button>
    </>
  );
}
