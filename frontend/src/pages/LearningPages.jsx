import React from "react";
import { Button, Progress, Tag } from "antd";
import { Check, Wallet } from "lucide-react";
import { CourseGrid, Empty, Field, PageTitle } from "../components/common";

export function LearningPage({ mine, orders, openCourse }) {
  return (
    <>
      <PageTitle
        kicker="LỘ TRÌNH CỦA BẠN"
        title="Khóa học đã ghi danh"
        desc="Tiếp tục học từ nơi bạn dừng lại."
      />
      <CourseGrid items={mine.map((x) => x.course)} open={openCourse} />
      <div className="section-heading">
        <h2>Giao dịch gần đây</h2>
      </div>
      <div className="list">
        {orders.map((o) => (
          <div className="list-row" key={o.id}>
            <Wallet size={19} />
            <b>{o.course.title}</b>
            <span>{Number(o.amount).toLocaleString("vi-VN")} ₫</span>
            <span className={"badge " + (o.status === "PAID" ? "green" : "")}>
              {o.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ResultsPage({ results, openResult }) {
  return (
    <>
      <PageTitle
        kicker="TIẾN ĐỘ"
        title="Kết quả luyện tập"
        desc="Mỗi lần luyện tập là một bước tiến về phía trước."
      />
      <div className="list">
        {results.map((r) => (
          <div className="list-row" key={r.id}>
            <div className="result-icon">
              <Check size={18} />
            </div>
            <b>{r.quiz.title}</b>
            <span>{new Date(r.completedAt).toLocaleDateString("vi-VN")}</span>
            <strong>
              {r.score}/{r.total}
            </strong>
            <Button onClick={() => openResult(r)}>Xem đáp án</Button>
          </div>
        ))}
      </div>
      {!results.length && (
        <Empty text="Chưa có kết quả. Hãy thử làm một bài quiz." />
      )}
    </>
  );
}

export function ReviewPage({ review, go }) {
  return (
    <>
      <PageTitle
        kicker="KẾT QUẢ LUYỆN TẬP"
        title={review.result.quiz.title}
      />
      <div className="review-summary">
        <Progress
          type="circle"
          percent={Math.round(
            (review.result.score / review.result.total) * 100,
          )}
        />
        <div>
          <h2>
            {review.result.score}/{review.result.total} câu chính xác
          </h2>
          <p>Đối chiếu đáp án và giải thích của giáo viên bên dưới.</p>
          <Button onClick={() => go("quizzes")}>Luyện tập tiếp</Button>
        </div>
      </div>
      {review.answers.map((a, i) => (
        <div className="take-card" key={a.id}>
          <Tag color={a.correct ? "green" : "red"}>
            {a.correct ? "Chính xác" : "Cần ôn tập"}
          </Tag>
          <h3>
            {i + 1}. {a.question}
          </h3>
          <p>Bạn chọn: {a.selected}</p>
          <p>
            <b>Đáp án đúng: {a.answer}</b>
          </p>
          <p className="muted">
            {a.explanation || "Giáo viên chưa thêm giải thích."}
          </p>
        </div>
      ))}
    </>
  );
}

export function ProfilePage({
  user,
  teacher,
  form,
  setForm,
  busy,
  saveProfile,
}) {
  return (
    <>
      <PageTitle kicker="TÀI KHOẢN" title="Hồ sơ cá nhân" />
      <div className="editor">
        <Tag color="cyan">{teacher ? "Giáo viên" : "Học viên"}</Tag>
        <p>{user?.email}</p>
        <Field
          label="Họ tên"
          value={form.name ?? user?.name}
          set={(v) => setForm({ ...form, name: v })}
        />
        <Button
          type="primary"
          loading={busy}
          onClick={() => saveProfile(form.name ?? user?.name)}
        >
          Lưu thay đổi
        </Button>
      </div>
    </>
  );
}
