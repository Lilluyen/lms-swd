import React from "react";
import { Button, Modal, Space } from "antd";
import { ArrowRight, BrainCircuit, Clock, Plus, Sparkles } from "lucide-react";
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
            <Plus size={17} /> Tạo quiz
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
      {!quizzes.length && <Empty text="Chưa có quiz. Hãy tạo quiz đầu tiên." />}
    </>
  );
}

export function QuizEditorPage({
  teacher,
  form,
  setForm,
  questions,
  saveQuiz,
  busy,
  generateTeacherQuiz,
}) {
  const subjectOf = (item) => item.question.subject?.trim() || "Chưa phân môn";
  const subjects = [...new Set(questions.map(subjectOf))].sort((a, b) =>
    a.localeCompare(b, "vi"),
  );
  const [selectedSubjects, setSelectedSubjects] = React.useState(() => [
    ...new Set(
      questions
        .filter((item) => form.questionIds?.includes(item.question.id))
        .map(subjectOf),
    ),
  ]);
  const toggleSubject = (subject, checked) => {
    setSelectedSubjects((previous) =>
      checked
        ? [...previous, subject]
        : previous.filter((value) => value !== subject),
    );
    const subjectIds = new Set(
      questions
        .filter((item) => subjectOf(item) === subject)
        .map((item) => item.question.id),
    );
    setForm((previous) => ({
      ...previous,
      subject:
        checked && !previous.subject?.trim() && subject !== "Chưa phân môn"
          ? subject
          : previous.subject,
      questionIds: checked
        ? previous.questionIds || []
        : (previous.questionIds || []).filter((id) => !subjectIds.has(id)),
    }));
  };
  return (
    <>
      <PageTitle
        kicker="LUYỆN TẬP"
        title={form.id ? "Chỉnh sửa quiz" : "Tạo quiz mới"}
        desc="Nhập tiêu đề và môn học để AI soạn câu hỏi, hoặc chọn từ ngân hàng."
      />
      <fieldset
        className="editor"
        disabled={busy}
        style={{ border: 0, minWidth: 0 }}
      >
        <Field
          label="Tiêu đề"
          value={form.title}
          set={(v) => setForm({ ...form, title: v, aiQuestions: undefined })}
        />
        <Field
          label="Môn học"
          value={form.subject}
          set={(v) => setForm({ ...form, subject: v, aiQuestions: undefined })}
        />
        <Field
          label="Thời gian (phút)"
          type="number"
          value={form.durationMinutes}
          set={(v) => setForm({ ...form, durationMinutes: Number(v) })}
        />
        {teacher ? (
          <>
            {!form.id && (
              <>
                <h3>Tạo câu hỏi bằng AI</h3>
                <p className="muted">
                  AI dựa trên cả tiêu đề và môn học. Xem lại bản nháp trước khi
                  lưu; câu hỏi sẽ được thêm vào ngân hàng của bạn cùng Quiz.
                </p>
                <Field
                  label="Số câu hỏi AI (1–20)"
                  type="number"
                  value={form.aiQuantity ?? 5}
                  set={(v) =>
                    setForm({
                      ...form,
                      aiQuantity: Number(v),
                      aiQuestions: undefined,
                    })
                  }
                />
                <label htmlFor="quiz-ai-difficulty">Độ khó</label>
                <select
                  id="quiz-ai-difficulty"
                  value={form.aiDifficulty || "MEDIUM"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      aiDifficulty: e.target.value,
                      aiQuestions: undefined,
                    })
                  }
                >
                  <option value="EASY">Dễ</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HARD">Khó</option>
                </select>
                <button
                  className="outline"
                  disabled={
                    busy ||
                    !form.title?.trim() ||
                    !form.subject?.trim() ||
                    (form.aiQuantity ?? 5) < 1 ||
                    (form.aiQuantity ?? 5) > 20 ||
                    !Number.isInteger(form.aiQuantity ?? 5)
                  }
                  onClick={generateTeacherQuiz}
                >
                  <Sparkles size={17} />{" "}
                  {busy
                    ? "Đang tạo…"
                    : form.aiQuestions
                      ? "AI tạo lại câu hỏi"
                      : "AI tạo câu hỏi"}
                </button>
              </>
            )}
            {form.aiQuestions && (
              <section aria-label="Bản nháp câu hỏi AI">
                <h3>Bản nháp AI · {form.aiQuestions.length} câu</h3>
                {form.aiQuestions.map((q, index) => (
                  <div className="take-card" key={index}>
                    <h4>
                      Câu {index + 1}: {q.content}
                    </h4>
                    <ol type="A">
                      {q.answers.map((answer, i) => (
                        <li key={i}>
                          {answer.content}
                          {answer.correct && <strong> — Đáp án đúng</strong>}
                        </li>
                      ))}
                    </ol>
                    <p>
                      <strong>Giải thích:</strong> {q.explanation}
                    </p>
                    <Button
                      danger
                      onClick={() =>
                        setForm({
                          ...form,
                          aiQuestions: form.aiQuestions.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      Bỏ câu này
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() => setForm({ ...form, aiQuestions: undefined })}
                >
                  Chọn từ ngân hàng thay thế
                </Button>
              </section>
            )}
            {!form.aiQuestions && (
              <>
                <h3>Chọn môn học trong ngân hàng</h3>
                <p className="muted">
                  Chọn một hoặc nhiều môn để mở danh sách câu hỏi. Bỏ chọn môn
                  sẽ bỏ các câu đã chọn của môn đó khỏi Quiz.
                </p>
                {subjects.map((subject) => (
                  <label className="check" key={subject}>
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(subject)}
                      onChange={(event) =>
                        toggleSubject(subject, event.target.checked)
                      }
                    />
                    {subject} (
                    {
                      questions.filter((item) => subjectOf(item) === subject)
                        .length
                    }{" "}
                    câu)
                  </label>
                ))}
                {!subjects.length && (
                  <Empty text="Ngân hàng chưa có câu hỏi. Hãy thêm câu hỏi hoặc tạo bằng AI." />
                )}
                {subjects.length > 0 && !selectedSubjects.length && (
                  <p className="muted">Chọn môn học để xem câu hỏi.</p>
                )}
                {selectedSubjects.map((subject) => (
                  <section key={subject} aria-label={`Câu hỏi môn ${subject}`}>
                    <h4>{subject}</h4>
                    {questions
                      .filter((item) => subjectOf(item) === subject)
                      .map((x) => (
                        <label className="check" key={x.question.id}>
                          <input
                            type="checkbox"
                            checked={(form.questionIds || []).includes(
                              x.question.id,
                            )}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                questionIds: e.target.checked
                                  ? [...(form.questionIds || []), x.question.id]
                                  : (form.questionIds || []).filter(
                                      (v) => v !== x.question.id,
                                    ),
                              })
                            }
                          />
                          {x.question.content}
                        </label>
                      ))}
                  </section>
                ))}
                <p aria-live="polite">
                  Đã chọn {form.questionIds?.length || 0} câu hỏi.
                </p>
              </>
            )}
          </>
        ) : (
          <p className="muted">
            Giáo viên tạo câu hỏi và gán vào quiz. Học viên có thể tạo quiz nháp
            cá nhân; cần câu hỏi để làm bài.
          </p>
        )}
        <button
          className="primary"
          onClick={saveQuiz}
          disabled={
            busy ||
            !form.title?.trim() ||
            !form.subject?.trim() ||
            form.durationMinutes < 1 ||
            form.durationMinutes > 180 ||
            !Number.isInteger(form.durationMinutes) ||
            !(form.aiQuestions
              ? form.aiQuestions.length
              : form.questionIds?.length)
          }
        >
          Lưu quiz
        </button>
      </fieldset>
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
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showSummary, setShowSummary] = React.useState(false);
  const [reviewSkipped, setReviewSkipped] = React.useState(false);
  const total = quizData.questions.length;
  const q = quizData.questions[currentIndex];
  const unanswered = quizData.questions.filter(
    (question) => !choices[question.id],
  );
  const advance = () => {
    if (reviewSkipped || currentIndex === total - 1) {
      setShowSummary(true);
    } else {
      setCurrentIndex((index) => index + 1);
    }
  };
  const confirmSubmit = () =>
    Modal.confirm({
      title: "Nộp bài luyện tập?",
      content: `Đã trả lời ${total - unanswered.length}/${total} câu. ${unanswered.length ? `${unanswered.length} câu chưa trả lời sẽ không được tính điểm.` : "Bạn đã trả lời tất cả câu hỏi."}`,
      okText: "Nộp bài",
      cancelText: "Tiếp tục làm",
      onOk: submitQuiz,
    });
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
      <p className="muted">
        Chọn đáp án rồi chuyển sang câu tiếp theo, hoặc bỏ qua để làm sau. Bạn
        có thể đổi đáp án trước khi nộp. Kết quả và giải thích chỉ hiển thị sau
        khi nộp bài.
      </p>
      {!showSummary && q && (
        <div className="take-card" key={q.id}>
          <span className="kicker" aria-live="polite">
            CÂU HỎI {currentIndex + 1}/{total}
          </span>
          <h3>{q.content}</h3>
          {q.answers.map((a) => (
            <label
              key={a.id}
              className={"choice " + (choices[q.id] === a.id ? "selected" : "")}
            >
              <input
                type="radio"
                name={"q" + q.id}
                checked={choices[q.id] === a.id}
                disabled={busy || remaining === 0}
                onChange={() =>
                  setChoices((previous) => ({ ...previous, [q.id]: a.id }))
                }
              />
              {a.content}
            </label>
          ))}

          <div className="actions" style={{ marginTop: 20 }}>
            {choices[q.id] ? (
              <button
                className="primary"
                disabled={busy || remaining === 0}
                onClick={advance}
              >
                {reviewSkipped
                  ? "Về tổng kết"
                  : currentIndex === total - 1
                    ? "Xem tổng kết"
                    : "Câu tiếp theo"}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="outline"
                disabled={busy || remaining === 0}
                onClick={advance}
              >
                {reviewSkipped ? "Bỏ qua, về tổng kết" : "Bỏ qua câu này"}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
      {showSummary && (
        <section className="take-card" aria-label="Tổng kết bài làm">
          <h2>Bạn đã xem hết các câu hỏi</h2>
          <p>
            Đã trả lời {total - unanswered.length}/{total} câu.
          </p>
          {unanswered.length ? (
            <>
              <p>
                Còn {unanswered.length} câu đã bỏ qua. Bạn có thể quay lại trả
                lời trước khi nộp:
              </p>
            </>
          ) : (
            <p>
              Bạn đã hoàn thành tất cả câu hỏi. Hãy nộp bài để xem kết quả và
              phân tích AI.
            </p>
          )}
          <div className="actions">
            {quizData.questions.map((question, index) => (
              <button
                className="outline"
                key={question.id}
                disabled={busy || remaining === 0}
                onClick={() => {
                  setCurrentIndex(index);
                  setReviewSkipped(true);
                  setShowSummary(false);
                }}
              >
                Câu {index + 1} ·{" "}
                {choices[question.id] ? "Đã chọn – xem lại" : "Chưa trả lời"}
              </button>
            ))}
          </div>
        </section>
      )}
      <button className="primary" disabled={busy} onClick={confirmSubmit}>
        Nộp bài <ArrowRight size={16} />
      </button>
    </>
  );
}
