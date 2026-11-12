import React, { useEffect, useState } from "react";
import { post } from "../api";
import { Button, Input, Progress, Tag } from "antd";
import {
  Archive,
  ArchiveRestore,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Play,
  Receipt,
  Search,
  User,
  Wallet,
} from "lucide-react";
import { Empty, Field, PageTitle } from "../components/common";

/**
 * MÀN HÌNH 4.4 — MY ENROLLED COURSES DASHBOARD
 * Hiển thị danh sách khóa học đã ghi danh của Student, bộ lọc 4 tab trạng thái
 * (All Courses, In Progress, Completed, Archived), ô tìm kiếm theo tên khóa học/giảng viên,
 * thanh tiến độ 0-100%, nút Bắt đầu học / Tiếp tục học và lịch sử giao dịch kèm Biên nhận.
 */
export function LearningPage({
  mine,
  orders,
  openCourse,
  startLearningCourse,
  toggleArchiveCourse,
  openReceipt,
}) {
  const [statusTab, setStatusTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedMine = (mine || []).filter((e) => e && e.course);

  const counts = {
    ALL: normalizedMine.filter((e) => !e.archived).length,
    IN_PROGRESS: normalizedMine.filter(
      (e) =>
        !e.archived &&
        (e.learningStatus === "IN_PROGRESS" ||
          (e.progressPercent > 0 && e.progressPercent < 100)),
    ).length,
    COMPLETED: normalizedMine.filter(
      (e) =>
        !e.archived &&
        (e.learningStatus === "COMPLETED" || e.progressPercent >= 100),
    ).length,
    ARCHIVED: normalizedMine.filter((e) => Boolean(e.archived)).length,
  };

  const filteredEnrollments = normalizedMine.filter((e) => {
    const c = e.course || {};
    const isArchived = Boolean(e.archived);
    const status =
      e.learningStatus ||
      (e.progressPercent >= 100
        ? "COMPLETED"
        : e.progressPercent > 0
          ? "IN_PROGRESS"
          : "JUST_ENROLLED");

    if (statusTab === "ARCHIVED") {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
      if (statusTab === "IN_PROGRESS" && status !== "IN_PROGRESS") return false;
      if (statusTab === "COMPLETED" && status !== "COMPLETED") return false;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const titleMatch = (c.title || "").toLowerCase().includes(q);
    const teacherMatch = (c.teacher?.name || "").toLowerCase().includes(q);
    const categoryMatch = (c.category || "").toLowerCase().includes(q);
    return titleMatch || teacherMatch || categoryMatch;
  });

  const tabs = [
    { key: "ALL", label: `Tất cả khóa học (${counts.ALL})` },
    { key: "IN_PROGRESS", label: `Đang học (${counts.IN_PROGRESS})` },
    { key: "COMPLETED", label: `Đã hoàn thành (${counts.COMPLETED})` },
    { key: "ARCHIVED", label: `Lưu trữ (${counts.ARCHIVED})` },
  ];

  return (
    <>
      <PageTitle
        kicker="LỘ TRÌNH CỦA BẠN (MY ENROLLED COURSES)"
        title="Khóa học đã ghi danh"
        desc="Quản lý các khóa học đã kích hoạt, theo dõi phần trăm hoàn thành và tiếp tục học từ bài giảng gần nhất."
      />

      {/* THANH LỌC TRẠNG THÁI (STATUS TABS) & TÌM KIẾM (SEARCH BOX) */}
      <div className="enrolled-toolbar">
        <div className="status-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={statusTab === tab.key}
              className={`status-tab-btn ${statusTab === tab.key ? "active" : ""}`}
              onClick={() => setStatusTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="enrolled-search">
          <Search size={16} />
          <input
            type="text"
            maxLength={100}
            value={searchQuery}
            placeholder="Tìm theo tên khóa học hoặc giảng viên..."
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm khóa học đã ghi danh"
          />
        </div>
      </div>

      {/* DANH SÁCH THẺ KHÓA HỌC ĐÃ GHI DANH (COURSE CARD LIST) */}
      <div className="course-grid">
        {filteredEnrollments.map((enrollment, idx) => {
          const c = enrollment.course || {};
          const percent = Number(enrollment.progressPercent ?? 0);
          const totalLessons = Number(enrollment.totalLessons ?? 0);
          const completedLessons = Number(enrollment.completedLessons ?? 0);
          const status =
            enrollment.learningStatus ||
            (percent >= 100
              ? "COMPLETED"
              : percent > 0
                ? "IN_PROGRESS"
                : "JUST_ENROLLED");
          const enrolledDate = enrollment.enrolledAt
            ? new Date(enrollment.enrolledAt).toLocaleDateString("vi-VN")
            : "Hôm nay";
          const paymentBadgeText =
            enrollment.paymentBadge ||
            (Number(c.price || 0) > 0
              ? "ĐÃ XÁC NHẬN THANH TOÁN"
              : "GHI DANH MIỄN PHÍ");

          return (
            <article
              key={enrollment.id || c.id}
              className="course-card enrolled-course-card"
              onClick={() => openCourse(c)}
            >
              <div className={`course-cover cover${idx % 3}`}>
                <img
                  src={c.cover || "/images/course-cover-default.png"}
                  alt={c.title}
                  onError={(e) => {
                    e.currentTarget.src = "/images/course-cover-default.png";
                  }}
                />
                <span className="cover-badge">{c.category || "KHÓA HỌC"}</span>
                <span className="enrolled-payment-badge">
                  <CheckCircle2 size={11} /> {paymentBadgeText}
                </span>
              </div>

              <div className="course-card-body">
                <div className="enrolled-status-row">
                  {status === "COMPLETED" ? (
                    <span className="learning-status-chip completed">
                      COMPLETED · ĐÃ HOÀN THÀNH
                    </span>
                  ) : status === "IN_PROGRESS" ? (
                    <span className="learning-status-chip in-progress">
                      IN PROGRESS · ĐANG HỌC
                    </span>
                  ) : (
                    <span className="learning-status-chip just-enrolled">
                      ACTIVE · MỚI GHI DANH
                    </span>
                  )}
                  <span className="enrolled-date-meta">
                    <Calendar size={12} /> {enrolledDate}
                  </span>
                </div>

                <h3>{c.title}</h3>

                <div className="enrolled-instructor-meta">
                  <User size={13} /> Giảng viên:{" "}
                  <b>{c.teacher?.name || "Giảng viên Learnova"}</b>
                </div>

                <div
                  className="enrolled-progress-block"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="progress-label-row">
                    <span>
                      Tiến độ: {completedLessons}/{totalLessons} bài học
                    </span>
                    <strong>{percent}%</strong>
                  </div>
                  <Progress
                    percent={percent}
                    showInfo={false}
                    strokeColor={percent >= 100 ? "#1f7a3d" : "#111111"}
                    trailColor="#e2dccd"
                  />
                </div>

                <div
                  className="enrolled-card-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="primary enrolled-main-btn"
                    onClick={() =>
                      startLearningCourse
                        ? startLearningCourse(enrollment)
                        : openCourse(c)
                    }
                  >
                    {status === "COMPLETED" ? (
                      <>
                        <Award size={15} /> Xem lại & Đánh giá
                      </>
                    ) : status === "IN_PROGRESS" ? (
                      <>
                        <Play size={15} /> Tiếp tục học
                      </>
                    ) : (
                      <>
                        <BookOpen size={15} /> Bắt đầu học (Bài 1)
                      </>
                    )}
                  </button>

                  {toggleArchiveCourse && (
                    <button
                      type="button"
                      className="outline enrolled-archive-btn"
                      title={
                        enrollment.archived
                          ? "Bỏ lưu trữ khóa học"
                          : "Lưu trữ khóa học"
                      }
                      onClick={() => toggleArchiveCourse(c.id)}
                    >
                      {enrollment.archived ? (
                        <ArchiveRestore size={15} />
                      ) : (
                        <Archive size={15} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!filteredEnrollments.length && (
        <Empty
          text={
            searchQuery.trim()
              ? "Không tìm thấy khóa học đã ghi danh phù hợp với từ khóa."
              : statusTab === "ARCHIVED"
                ? "Chưa có khóa học nào trong mục Lưu trữ."
                : "Chưa có khóa học nào trong danh mục này."
          }
        />
      )}

      {/* LỊCH SỬ GIAO DỊCH & BIÊN NHẬN THANH TOÁN */}
      <div className="section-heading">
        <div>
          <span className="kicker">LỊCH SỬ THANH TOÁN PAYOS / SE PAY</span>
          <h2>Giao dịch gần đây</h2>
        </div>
      </div>
      <div className="list">
        {orders.map((o) => (
          <div className="list-row order-history-row" key={o.id}>
            <Wallet size={19} />
            <div className="order-history-info">
              <b>{o.course?.title}</b>
              <span className="order-code-sub">
                Mã đơn: #{o.paymentCode}{" "}
                {o.voucherCode ? `· Voucher: ${o.voucherCode}` : ""}
              </span>
            </div>
            <strong>{Number(o.amount).toLocaleString("vi-VN")} ₫</strong>
            <span className={"badge " + (o.status === "PAID" ? "green" : "")}>
              {o.status}
            </span>
            {openReceipt && (
              <Button
                size="small"
                onClick={() => openReceipt(o)}
                icon={<Receipt size={14} />}
              >
                {o.status === "PAID" ? "Biên nhận" : "Chi tiết"}
              </Button>
            )}
          </div>
        ))}
        {!orders.length && (
          <Empty text="Bạn chưa có giao dịch thanh toán khóa học có phí nào." />
        )}
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
  const [analysis, setAnalysis] = useState(review.result.aiFeedback || "");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (review.result.aiFeedback) return;
    let active = true;
    setAnalyzing(true);
    setAnalysisError("");
    post(`/results/${review.result.id}/analysis`, {})
      .then((data) => {
        if (active) setAnalysis(data.feedback);
      })
      .catch((error) => {
        if (active) setAnalysisError(error.message);
      })
      .finally(() => {
        if (active) setAnalyzing(false);
      });
    return () => {
      active = false;
    };
  }, [review.result.id, review.result.aiFeedback, retry]);
  return (
    <>
      <PageTitle kicker="KẾT QUẢ LUYỆN TẬP" title={review.result.quiz.title} />
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
      <section className="take-card" aria-label="Đánh giá kết quả bằng AI">
        <h2>AI phân tích kết quả</h2>
        <p className="muted">
          Nhận xét dựa trên bài luyện tập đã nộp, giúp bạn xác định nội dung cần
          ôn.
        </p>
        {analyzing && (
          <p role="status">
            AI đang phân tích câu trả lời và xây dựng gợi ý ôn tập…
          </p>
        )}
        {analysis && (
          <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {analysis}
          </div>
        )}
        {analysisError && (
          <div role="alert">
            <p>
              Điểm và bài làm đã được lưu. Chưa thể phân tích AI:{" "}
              {analysisError}
            </p>
            <Button
              disabled={analyzing}
              onClick={() => setRetry((value) => value + 1)}
            >
              Thử phân tích lại
            </Button>
          </div>
        )}
      </section>
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
