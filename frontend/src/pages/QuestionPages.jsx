import React, { useState } from "react";
import { Button, Input, Modal, Select, Space, Table, Tag } from "antd";
import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Field, PageTitle } from "../components/common";
import { QuestionAiStudio } from "../teacher";

export function QuestionsPage({
  questions,
  subject,
  setSubject,
  query,
  setQuery,
  difficulty,
  setDifficulty,
  form,
  setForm,
  setPage,
  setGenerated,
  onDeleteQuestion,
}) {
  const [preview, setPreview] = useState(null);

  const filteredQuestions = questions.filter(
    (x) =>
      (!subject || x.question.subject === subject) &&
      (!difficulty || x.question.difficulty === difficulty) &&
      x.question.content.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <PageTitle
        kicker="NGÂN HÀNG CÂU HỎI"
        title={subject || "Các môn học"}
        desc="Chọn môn học để quản lý, tìm kiếm và tái sử dụng câu hỏi."
      />
      <div className="subject-tabs">
        <Button
          type={!subject ? "primary" : "default"}
          onClick={() => setSubject("")}
        >
          Tất cả
        </Button>
        {[...new Set(questions.map((x) => x.question.subject))].map((v) => (
          <Button
            key={v}
            type={subject === v ? "primary" : "default"}
            onClick={() => setSubject(v)}
          >
            {v}{" "}
            <Tag>
              {questions.filter((x) => x.question.subject === v).length}
            </Tag>
          </Button>
        ))}
      </div>
      <div className="toolbar">
        <Input.Search
          placeholder="Tìm nội dung câu hỏi"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
          style={{ maxWidth: 300 }}
        />
        <Select
          value={difficulty || undefined}
          placeholder="Tất cả độ khó"
          allowClear
          onChange={(v) => setDifficulty(v || "")}
          style={{ width: 160 }}
          options={[
            { value: "EASY", label: "Dễ" },
            { value: "MEDIUM", label: "Trung bình" },
            { value: "HARD", label: "Khó" },
          ]}
        />
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            setForm({
              subject,
              content: "",
              difficulty: "MEDIUM",
              explanation: "",
              answers: [0, 1, 2, 3].map(() => ({
                content: "",
                correct: false,
              })),
            });
            setPage("edit-question");
          }}
        >
          Tạo câu hỏi
        </Button>
        <Button
          icon={<Sparkles size={16} />}
          onClick={() => {
            setForm({
              subject,
              topic: "",
              difficulty: "MEDIUM",
              quantity: 3,
            });
            setGenerated([]);
            setPage("generate");
          }}
        >
          Tạo bằng AI
        </Button>
      </div>
      <Table
        rowKey={(x) => x.question.id}
        dataSource={filteredQuestions}
        pagination={{ pageSize: 8, showTotal: (n) => `${n} câu hỏi` }}
        scroll={{ x: 700 }}
        columns={[
          {
            title: "Câu hỏi",
            render: (_, x) => (
              <div>
                <b>{x.question.content}</b>
                <div className="muted">
                  {x.question.subject} · {x.answers.length} lựa chọn
                </div>
              </div>
            ),
          },
          {
            title: "Độ khó",
            width: 120,
            render: (_, x) => (
              <Tag
                color={
                  { EASY: "green", MEDIUM: "gold", HARD: "red" }[
                    x.question.difficulty
                  ]
                }
              >
                {
                  { EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó" }[
                    x.question.difficulty
                  ]
                }
              </Tag>
            ),
          },
          {
            title: "Thao tác",
            width: 170,
            render: (_, x) => (
              <Space>
                <Button onClick={() => setPreview(x)}>Xem</Button>
                <Button
                  aria-label="Sửa câu hỏi"
                  icon={<Pencil size={14} />}
                  onClick={() => {
                    setForm({
                      ...x.question,
                      answers: x.answers.map((v) => ({
                        content: v.content,
                        correct: v.correct,
                      })),
                    });
                    setPage("edit-question");
                  }}
                />
                <Button
                  danger
                  aria-label="Xóa câu hỏi"
                  icon={<Trash2 size={14} />}
                  onClick={() => onDeleteQuestion(x.question.id)}
                />
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        width={560}
        centered
        className="question-preview-modal"
      >
        {preview && (
          <QuestionPreview item={preview} onClose={() => setPreview(null)} />
        )}
      </Modal>
    </>
  );
}

function QuestionPreview({ item, onClose }) {
  const { question, answers } = item;
  return (
    <article className="question-preview">
      <div className="question-preview-tags">
        <Tag>{question.subject}</Tag>
        <Tag
          color={
            { EASY: "green", MEDIUM: "gold", HARD: "red" }[
              question.difficulty
            ]
          }
        >
          {
            { EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó" }[
              question.difficulty
            ]
          }
        </Tag>
      </div>
      <h3 className="question-preview-title">{question.content}</h3>
      <ol className="question-preview-answers">
        {answers.map((answer, index) => (
          <li
            key={answer.id ?? index}
            className={answer.correct ? "is-correct" : undefined}
          >
            <span className="question-preview-letter">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="question-preview-text">{answer.content}</span>
            {answer.correct && (
              <span className="question-preview-badge">Đáp án đúng</span>
            )}
          </li>
        ))}
      </ol>
      {!!question.explanation?.trim() && (
        <section className="question-preview-explanation">
          <h4>Giải thích</h4>
          <p>{question.explanation}</p>
        </section>
      )}
      <div className="question-preview-footer">
        <Button onClick={onClose}>Đóng</Button>
      </div>
    </article>
  );
}

export function QuestionEditorPage({ form, setForm, uploadQuestion }) {
  return (
    <>
      <PageTitle
        kicker="NGÂN HÀNG CÂU HỎI"
        title={form.id ? "Chỉnh sửa câu hỏi" : "Tạo câu hỏi mới"}
      />
      <div className="editor">
        <Field
          label="Môn học (Subject)"
          value={form.subject}
          set={(v) => setForm({ ...form, subject: v })}
        />
        <Field
          label="Nội dung câu hỏi"
          area
          value={form.content}
          set={(v) => setForm({ ...form, content: v })}
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
        <label>Đáp án (chọn một đáp án đúng)</label>
        {form.answers?.map((a, i) => (
          <div className="answer-edit" key={i}>
            <input
              type="radio"
              name="correct"
              checked={a.correct}
              onChange={() =>
                setForm({
                  ...form,
                  answers: form.answers.map((v, j) => ({
                    ...v,
                    correct: j === i,
                  })),
                })
              }
            />
            <input
              placeholder={"Đáp án " + String.fromCharCode(65 + i)}
              value={a.content}
              onChange={(e) =>
                setForm({
                  ...form,
                  answers: form.answers.map((v, j) =>
                    j === i ? { ...v, content: e.target.value } : v,
                  ),
                })
              }
            />
          </div>
        ))}
        <Field
          label="Giải thích"
          area
          value={form.explanation}
          set={(v) => setForm({ ...form, explanation: v })}
        />
        <button className="primary" onClick={() => uploadQuestion(form, form.id)}>
          Lưu câu hỏi
        </button>
      </div>
    </>
  );
}

export function GenerateQuestionPage({
  subject,
  form,
  setPage,
  reloadQuestions,
}) {
  return (
    <QuestionAiStudio
      initialSubject={form.subject || subject}
      onSaved={reloadQuestions}
      onCancel={() => setPage("questions")}
    />
  );
}
