import React from "react";
import { Button, Input, Select, Tag } from "antd";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Heart,
  Layers,
  Pencil,
  Play,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { CopyButton, Empty, PageTitle } from "../components/common";

function PaymentCard({ payment, payRemaining, cancelPayment }) {
  return (
    <div
      className={`payment-card payment-${payment.status?.toLowerCase()}`}
    >
      <div className="payment-heading">
        <div>
          <span className="kicker">THANH TOÁN AN TOÀN</span>
          <h2>Thanh toán qua SE Pay</h2>
        </div>
        <span className="payment-status">
          {payment.status === "PENDING" && "Đang chờ thanh toán"}
          {payment.status === "PAID" && "Đã thanh toán"}
          {payment.status === "EXPIRED" && "Đã hết hạn"}
          {payment.status === "CANCELLED" && "Đã hủy"}
          {payment.status === "UNDERPAID" && "Chuyển thiếu tiền"}
          {payment.status === "LATE_PAYMENT" && "Cần đối soát"}
        </span>
      </div>
      <div className="payment-layout">
        {payment.qrUrl && (
          <img src={payment.qrUrl} alt="Mã QR chuyển khoản SE Pay" />
        )}
        <div className="payment-details">
          <div>
            <span>Số tiền</span>
            <strong>{Number(payment.amount).toLocaleString("vi-VN")} ₫</strong>
          </div>
          <div>
            <span>Ngân hàng</span>
            <strong>{payment.bank}</strong>
          </div>
          <div>
            <span>Số tài khoản</span>
            <strong>{payment.account}</strong>
            <CopyButton value={payment.account} />
          </div>
          {payment.accountName && (
            <div>
              <span>Chủ tài khoản</span>
              <strong>{payment.accountName}</strong>
            </div>
          )}
          <div className="payment-code">
            <span>Nội dung chuyển khoản</span>
            <strong>{payment.paymentCode}</strong>
            <CopyButton value={payment.paymentCode} />
          </div>
        </div>
      </div>
      {payment.status === "PENDING" ? (
        <div className="payment-footer">
          <p>
            <Clock size={16} /> Còn{" "}
            {String(Math.floor((payRemaining || 0) / 60)).padStart(2, "0")}:
            {String((payRemaining || 0) % 60).padStart(2, "0")} · Tự động kiểm
            tra mỗi 2 giây
          </p>
          <button className="outline danger" onClick={cancelPayment}>
            Hủy phiên thanh toán
          </button>
        </div>
      ) : (
        <p className="payment-message">
          {payment.status === "PAID"
            ? "Thanh toán đã được xác minh. Bạn có thể bắt đầu học ngay."
            : payment.status === "UNDERPAID" ||
                payment.status === "LATE_PAYMENT"
              ? "Giao dịch cần được quản trị viên đối soát. Vui lòng giữ lại biên lai chuyển khoản."
              : "Phiên này không còn hiệu lực. Bạn có thể tạo một phiên thanh toán mới."}
        </p>
      )}
    </div>
  );
}

export function CoursePage({
  selected,
  detail,
  payment,
  payRemaining,
  teacher,
  user,
  progress,
  go,
  setPage,
  setForm,
  setManage,
  checkout,
  toggleWishlist,
  submitReview,
  cancelPayment,
  busy,
  reviewDraft,
  setReviewDraft,
  onLockedLesson,
}) {
  return (
    <>
      <button
        className="back"
        onClick={() => go(teacher ? "t-courses" : "catalog")}
      >
        ← Quay lại
      </button>
      <div className="course-hero">
        <div>
          <span className="kicker">{selected.category || "KHÓA HỌC"}</span>
          <h1>{selected.title}</h1>
          <p>
            {selected.description ||
              "Khám phá kiến thức mới cùng Learnova."}
          </p>
          <div className="course-meta">
            <span>
              <BookOpen size={16} /> {detail?.content?.length || 0} module
            </span>
            <span>
              <Users size={16} /> {selected.teacher?.name}
            </span>
            <span>
              <Star
                size={16}
                fill={selected.rating != null ? "currentColor" : "none"}
              />
              {selected.rating != null
                ? `${Number(selected.rating).toFixed(1)} (${selected.reviewCount || 0})`
                : "Chưa có đánh giá"}
            </span>
            <span>
              <GraduationCap size={16} /> {selected.enrollmentCount || 0} học
              viên
            </span>
          </div>
          {teacher && selected.teacher?.id === user?.id ? (
            <div className="hero-actions">
              <button
                className="primary"
                onClick={() => {
                  setManage({ courseId: selected.id });
                  setPage("t-modules");
                }}
              >
                <Layers size={16} /> Quản lý module
              </button>
              <button
                className="outline"
                onClick={() => {
                  setManage({ courseId: selected.id });
                  setPage("t-course-form");
                }}
              >
                <Pencil size={16} /> Chỉnh sửa khóa học
              </button>
            </div>
          ) : (
            !teacher && (
              <div className="hero-actions">
                {!detail?.access && (
                  <button className="primary" onClick={checkout}>
                    <Wallet size={17} />{" "}
                    {Number(selected.price) === 0
                      ? "Ghi danh miễn phí"
                      : `Mua khóa học · ${Number(selected.price || 0).toLocaleString("vi-VN")} ₫`}
                  </button>
                )}
                <button
                  className={detail?.wishlisted ? "wishlist active" : "wishlist"}
                  onClick={toggleWishlist}
                  aria-pressed={Boolean(detail?.wishlisted)}
                >
                  <Heart
                    size={17}
                    fill={detail?.wishlisted ? "currentColor" : "none"}
                  />
                  {detail?.wishlisted ? "Đã yêu thích" : "Yêu thích"}
                </button>
              </div>
            )
          )}
        </div>
        <div className="course-illustration">
          <img
            src={selected.cover || "/images/course-cover-default.png"}
            alt={`Ảnh minh họa khóa học ${selected.title}`}
            onError={(event) => {
              event.currentTarget.src = "/images/course-cover-default.png";
            }}
          />
        </div>
      </div>
      {payment && !payment.free && (
        <PaymentCard
          payment={payment}
          payRemaining={payRemaining}
          cancelPayment={cancelPayment}
        />
      )}
      <div className="section-heading">
        <h2>Nội dung khóa học</h2>
        {teacher && selected?.teacher?.id === user?.id && (
          <button
            className="outline"
            onClick={() => {
              setManage({ courseId: selected.id });
              setPage("t-modules");
            }}
          >
            <Layers size={16} /> Quản lý module
          </button>
        )}
      </div>
      <div className="module-list">
        {detail?.content?.map(({ module, lessons: ls }, i) => (
          <div className="module-card" key={module.id}>
            <div className="module-heading">
              <div>
                <span className="module-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <b>{module.title}</b>
              </div>
            </div>
            {ls.map((l) => (
              <div className="lesson" key={l.id}>
                <Play size={15} />
                <span
                  onClick={() => {
                    if (detail.access) {
                      setForm(l);
                      setPage("lesson");
                    } else {
                      onLockedLesson();
                    }
                  }}
                >
                  {l.title}{" "}
                  {progress.some((p) => p.lessonId === l.id) && (
                    <Tag color="green">Hoàn thành</Tag>
                  )}
                </span>
              </div>
            ))}
          </div>
        ))}
        {!detail?.content?.length && (
          <Empty text="Khóa học chưa có nội dung." />
        )}
      </div>
      <section
        className="course-reviews"
        aria-labelledby="course-reviews-title"
      >
        <div className="section-heading">
          <div>
            <span className="kicker">CẢM NHẬN HỌC VIÊN</span>
            <h2 id="course-reviews-title">Đánh giá khóa học</h2>
          </div>
          <span className="review-score">
            <Star size={18} fill="currentColor" />{" "}
            {selected.rating != null
              ? Number(selected.rating).toFixed(1)
              : "—"}{" "}
            / 5
          </span>
        </div>
        {!teacher && detail?.access && (
          <div className="review-form">
            <Select
              value={reviewDraft.rating}
              onChange={(rating) =>
                setReviewDraft((current) => ({ ...current, rating }))
              }
              options={[5, 4, 3, 2, 1].map((rating) => ({
                value: rating,
                label: `${rating} sao`,
              }))}
              aria-label="Số sao đánh giá"
            />
            <Input.TextArea
              value={reviewDraft.comment}
              maxLength={1000}
              showCount
              rows={3}
              placeholder="Chia sẻ trải nghiệm học tập của bạn..."
              onChange={(event) =>
                setReviewDraft((current) => ({
                  ...current,
                  comment: event.target.value,
                }))
              }
            />
            <Button type="primary" loading={busy} onClick={submitReview}>
              Gửi đánh giá
            </Button>
          </div>
        )}
        <div className="review-list">
          {detail?.reviews?.map((item) => (
            <article className="review-item" key={item.id}>
              <div className="review-avatar" aria-hidden="true">
                {item.student?.name?.slice(0, 1)?.toUpperCase() || "H"}
              </div>
              <div>
                <div className="review-item-heading">
                  <strong>{item.student?.name || "Học viên"}</strong>
                  <span>
                    {"★".repeat(item.rating)}
                    {"☆".repeat(5 - item.rating)}
                  </span>
                </div>
                <p>{item.comment || "Học viên đã đánh giá khóa học."}</p>
              </div>
            </article>
          ))}
          {!detail?.reviews?.length && (
            <Empty text="Chưa có đánh giá nào cho khóa học này." />
          )}
        </div>
      </section>
    </>
  );
}

export function LessonPage({
  lesson,
  teacher,
  progress,
  backToCourse,
  completeLesson,
}) {
  return (
    <>
      <button className="back" onClick={backToCourse}>
        ← Quay lại khóa học
      </button>
      <PageTitle kicker="BÀI HỌC" title={lesson.title} />
      {lesson.videoUrl && (
        <div className="video">
          <a href={lesson.videoUrl} target="_blank" rel="noreferrer">
            <Play /> Mở video bài học
          </a>
        </div>
      )}
      <div className="lesson-content">{lesson.content}</div>
      {!teacher && (
        <Button
          type="primary"
          style={{ marginTop: 20 }}
          onClick={() => completeLesson(lesson)}
        >
          {progress.some((p) => p.lessonId === lesson.id)
            ? "✓ Đã hoàn thành"
            : "Đánh dấu hoàn thành"}
        </Button>
      )}
    </>
  );
}
