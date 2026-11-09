import React, { useState } from "react";
import { Button, Input, Select, Tag } from "antd";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Heart,
  Layers,
  Lock,
  Pencil,
  Play,
  QrCode,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  TicketPercent,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { CopyButton, Empty, PageTitle } from "../components/common";

/**
 * Thanh tiến trình 3 bước của luồng Đăng ký & Thanh toán (Checkout Stepper)
 */
export function CheckoutStepper({ activeStep = 2 }) {
  const steps = [
    { index: 1, title: "1. Chọn khóa học", sub: "Kiểm tra điều kiện" },
    { index: 2, title: "2. Thanh toán VietQR", sub: "Cổng PayOS / SE Pay" },
    { index: 3, title: "3. Hoàn tất & Vào học", sub: "Biên nhận & Mở khóa" },
  ];
  return (
    <div className="checkout-stepper" aria-label="Tiến trình thanh toán">
      {steps.map((step) => {
        const done = step.index < activeStep || activeStep === 3;
        const current = step.index === activeStep && activeStep !== 3;
        return (
          <div
            key={step.index}
            className={`stepper-item ${done ? "done" : ""} ${current ? "current" : ""}`}
          >
            <span className="stepper-badge">
              {done ? <Check size={14} /> : step.index}
            </span>
            <div>
              <strong>{step.title}</strong>
              <span>{step.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * MÀN HÌNH 4.2 — CHECKOUT & VIETQR PAYMENT SCREEN
 * Hiển thị Stepper, Order Breakdown, Ô nhập mã giảm giá (Voucher),
 * Mã QR động VietQR/PayOS, Đồng hồ đếm ngược 15 phút và Thanh trạng thái Polling.
 */
function PaymentCard({
  selected,
  user,
  payment,
  payRemaining,
  cancelPayment,
  applyVoucher,
  simulatePayment,
  openReceipt,
  busy,
}) {
  const [voucherInput, setVoucherInput] = useState(payment.voucherCode || "");
  const originalAmount = Number(
    payment.originalAmount ?? selected?.price ?? payment.amount ?? 0,
  );
  const discountAmount = Number(payment.discountAmount || 0);
  const finalAmount = Number(payment.amount || 0);

  return (
    <section
      className={`payment-card payment-${payment.status?.toLowerCase()}`}
      aria-label="Khu vực thanh toán VietQR PayOS"
    >
      <CheckoutStepper activeStep={payment.status === "PAID" ? 3 : 2} />

      <div className="payment-heading">
        <div>
          <span className="kicker">CỔNG THANH TOÁN TỰ ĐỘNG 24/7</span>
          <h2>Thanh toán qua PayOS / SE Pay VietQR</h2>
        </div>
        <span className="payment-status">
          {payment.status === "PENDING" && "Đang chờ chuyển khoản"}
          {payment.status === "PAID" && "Đã thanh toán thành công"}
          {payment.status === "EXPIRED" && "Đã hết hạn (15:00)"}
          {payment.status === "CANCELLED" && "Đã hủy đơn"}
          {payment.status === "UNDERPAID" && "Chuyển thiếu tiền"}
          {payment.status === "LATE_PAYMENT" && "Cần đối soát"}
        </span>
      </div>

      <div className="checkout-grid">
        {/* CỘT TRÁI: TÓM TẮT ĐƠN HÀNG & MÃ GIẢM GIÁ (ORDER BREAKDOWN & VOUCHER) */}
        <div className="order-breakdown-box">
          <div className="breakdown-header">
            <span className="kicker">CHI TIẾT ĐƠN HÀNG (ORDER SUMMARY)</span>
            <strong>Mã đơn: #{payment.paymentCode}</strong>
          </div>

          <div className="breakdown-course-item">
            <img
              src={selected?.cover || "/images/course-cover-default.png"}
              alt={selected?.title}
              onError={(e) => {
                e.currentTarget.src = "/images/course-cover-default.png";
              }}
            />
            <div>
              <b>{selected?.title || payment.course?.title}</b>
              <span>
                Giảng viên: {selected?.teacher?.name || "Giảng viên Learnova"}
              </span>
              <span>
                Học viên: {user?.name || payment.student?.name || "Học viên"}
              </span>
            </div>
          </div>

          {payment.status === "PENDING" && (
            <div className="voucher-box">
              <label className="voucher-label">
                <TicketPercent size={15} /> Mã giảm giá / Khuyến mãi (Discount
                Code)
              </label>
              <div className="voucher-input-row">
                <Input
                  value={voucherInput}
                  maxLength={30}
                  placeholder="Nhập mã (VD: LEARNOVA50, SWD2026)"
                  onChange={(e) =>
                    setVoucherInput(e.target.value.toUpperCase())
                  }
                  onPressEnter={() =>
                    applyVoucher && applyVoucher(voucherInput)
                  }
                />
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => applyVoucher && applyVoucher(voucherInput)}
                >
                  Áp dụng
                </button>
              </div>
              <div className="voucher-Presets">
                <span>Mã khả dụng:</span>
                {["LEARNOVA50", "SWD2026", "STUDENT20", "TEST2K"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`voucher-chip ${payment.voucherCode === code ? "active" : ""}`}
                    onClick={() => {
                      setVoucherInput(code);
                      applyVoucher && applyVoucher(code);
                    }}
                  >
                    {code}
                  </button>
                ))}
                {payment.voucherCode && (
                  <button
                    type="button"
                    className="voucher-chip clear"
                    onClick={() => {
                      setVoucherInput("");
                      applyVoucher && applyVoucher("");
                    }}
                  >
                    Bỏ mã
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="breakdown-rows">
            <div className="breakdown-row">
              <span>Giá gốc khóa học (Original Price)</span>
              <strong>{originalAmount.toLocaleString("vi-VN")} ₫</strong>
            </div>
            <div className="breakdown-row discount">
              <span>
                Giảm giá Voucher{" "}
                {payment.voucherCode ? `(${payment.voucherCode})` : ""}
              </span>
              <strong>
                {discountAmount > 0
                  ? `- ${discountAmount.toLocaleString("vi-VN")} ₫`
                  : "0 ₫"}
              </strong>
            </div>
            <div className="breakdown-row">
              <span>Phương thức thanh toán</span>
              <strong>VietQR Napas 247 (PayOS / SE Pay)</strong>
            </div>
            <div className="breakdown-row total">
              <span>TỔNG THANH TOÁN (TOTAL)</span>
              <strong>{finalAmount.toLocaleString("vi-VN")} ₫</strong>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: MÃ VIETQR & THÔNG TIN CHUYỂN KHOẢN NGÂN HÀNG */}
        <div className="qr-payment-box">
          <div className="payment-layout">
            {payment.qrUrl && (
              <div className="qr-frame">
                <img src={payment.qrUrl} alt="Mã QR chuyển khoản SE Pay" />
                <span className="qr-caption">
                  <QrCode size={13} /> Quét bằng mọi App Ngân hàng
                </span>
              </div>
            )}
            <div className="payment-details">
              <div>
                <span>Số tiền</span>
                <strong>
                  {Number(payment.amount).toLocaleString("vi-VN")} ₫
                </strong>
                <CopyButton value={String(payment.amount)} />
              </div>
              <div>
                <span>Ngân hàng</span>
                <strong>{payment.bank} (Napas 247)</strong>
                <span />
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
                  <span />
                </div>
              )}
              <div className="payment-code">
                <span>Nội dung chuyển khoản</span>
                <strong>{payment.paymentCode}</strong>
                <CopyButton value={payment.paymentCode} />
              </div>
            </div>
          </div>

          {payment.status === "PENDING" && (
            <div className="polling-status-bar" role="status">
              <span className="pulse-dot" />
              <span>
                Trạng thái: Đang chờ ngân hàng xác nhận chuyển khoản... (Tự động
                kiểm tra mỗi 2 giây)
              </span>
            </div>
          )}
        </div>
      </div>

      {payment.status === "PENDING" ? (
        <div className="payment-footer">
          <p className="countdown-box">
            <Clock size={16} /> Thời gian giữ đơn còn{" "}
            <strong>
              {String(Math.floor((payRemaining || 0) / 60)).padStart(2, "0")}:
              {String((payRemaining || 0) % 60).padStart(2, "0")}
            </strong>{" "}
            · Tự động kiểm tra mỗi 2 giây
          </p>
          <div className="payment-footer-actions">
            {simulatePayment && (
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={simulatePayment}
                title="Dùng khi thuyết trình/demo để kích hoạt Webhook thanh toán thành công ngay lập tức"
              >
                <CheckCircle2 size={16} /> Xác nhận đã chuyển khoản (Demo
                Webhook)
              </button>
            )}
            <button
              type="button"
              className="outline danger"
              onClick={cancelPayment}
            >
              Hủy phiên thanh toán
            </button>
          </div>
        </div>
      ) : (
        <div className="payment-footer">
          <p className="payment-message">
            {payment.status === "PAID"
              ? "Thanh toán đã được xác minh. Khóa học đã được kích hoạt thành công!"
              : payment.status === "UNDERPAID" ||
                  payment.status === "LATE_PAYMENT"
                ? "Giao dịch cần được quản trị viên đối soát. Vui lòng giữ lại biên lai chuyển khoản."
                : "Phiên này không còn hiệu lực. Bạn có thể bấm Mua khóa học để tạo một phiên thanh toán mới."}
          </p>
          {payment.status === "PAID" && openReceipt && (
            <button
              type="button"
              className="primary"
              onClick={() => openReceipt(payment)}
            >
              <Receipt size={16} /> Xem biên nhận giao dịch
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * MÀN HÌNH 4.3 — PAYMENT RESULT & CONFIRMATION SCREEN
 * Hiển thị xác nhận thanh toán thành công, biên nhận giao dịch (Transaction Receipt),
 * nút Bắt đầu học ngay (mở Bài 1) và nút Tải / In biên nhận PDF tiếng Việt.
 */
export function PaymentResultPage({
  payment,
  course,
  user,
  startLearningNow,
  go,
  backToCourse,
}) {
  if (!payment) {
    return (
      <Empty text="Không tìm thấy thông tin giao dịch. Hãy kiểm tra trong mục Khóa học đã mua." />
    );
  }

  const targetCourse = course || payment.course || {};
  const isPaid = payment.status === "PAID" || payment.free;
  const paidAmount = Number(payment.paidAmount ?? payment.amount ?? 0);
  const originalAmount = Number(
    payment.originalAmount ?? targetCourse.price ?? paidAmount,
  );
  const discountAmount = Number(payment.discountAmount || 0);
  const timestampText =
    payment.paymentTimestampVn ||
    (payment.paymentDate
      ? new Date(payment.paymentDate).toLocaleString("vi-VN") + " GMT+7"
      : new Date().toLocaleString("vi-VN") + " GMT+7");

  const handleDownloadReceipt = () => {
    const win = window.open("", "_blank", "width=820,height=680");
    if (!win) return;
    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Biên nhận thanh toán - ${payment.paymentCode || "FREE"}</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; color: #111; background: #f5f2e8; padding: 32px; }
    .sheet { max-width: 680px; margin: 0 auto; background: #fffdf6; border: 3px solid #111; box-shadow: 6px 6px 0 #111; padding: 28px 32px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { font-size: 22px; font-weight: 900; letter-spacing: 0.04em; }
    .badge { background: #1f7a3d; color: #fff; padding: 6px 12px; font-weight: 800; font-size: 12px; border: 2px solid #111; }
    h1 { font-size: 22px; text-transform: uppercase; margin: 0 0 6px; }
    p.sub { color: #555; font-size: 13px; margin: 0 0 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #ccc; font-size: 14px; }
    th { width: 42%; color: #555; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em; }
    td { font-weight: 700; }
    .total-row th, .total-row td { border-top: 2px solid #111; border-bottom: 2px solid #111; font-size: 16px; background: #efeade; }
    .footer { text-align: center; font-size: 12px; color: #555; margin-top: 24px; }
    @media print { body { background: #fff; padding: 0; } .sheet { box-shadow: none; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="logo">[L] LEARNOVA LMS</div>
      <div class="badge">ĐÃ XÁC THỰC THANH TOÁN (PAID)</div>
    </div>
    <h1>Biên Nhận Thanh Toán & Ghi Danh Khóa Học</h1>
    <p class="sub">Chứng từ xác nhận giao dịch điện tử qua cổng thanh toán VietQR / PayOS</p>
    <table>
      <tr><th>Khóa học đăng ký (Course Name)</th><td>${targetCourse.title || "Khóa học Learnova"}</td></tr>
      <tr><th>Học viên (Student)</th><td>${user?.name || payment.student?.name || "Học viên"} (${user?.email || payment.student?.email || ""})</td></tr>
      <tr><th>Mã đơn hàng LMS (Order Code)</th><td>${payment.paymentCode || "FREE-ENROLL"}</td></tr>
      <tr><th>Mã giao dịch cổng thanh toán (Transaction ID)</th><td>${payment.transactionReference || "TXN-PAYOS-VERIFIED"}</td></tr>
      <tr><th>Cổng thanh toán (Payment Gateway)</th><td>${payment.gateway || "PayOS / SE Pay VietQR Napas 247"}</td></tr>
      <tr><th>Giá gốc (Original Price)</th><td>${originalAmount.toLocaleString("vi-VN")} ₫</td></tr>
      <tr><th>Khuyến mãi (Discount Voucher)</th><td>${discountAmount > 0 ? "- " + discountAmount.toLocaleString("vi-VN") + " ₫ (" + (payment.voucherCode || "") + ")" : "0 ₫"}</td></tr>
      <tr class="total-row"><th>TỔNG TIỀN ĐÃ THANH TOÁN (AMOUNT PAID)</th><td>${paidAmount.toLocaleString("vi-VN")} ₫</td></tr>
      <tr><th>Thời điểm thanh toán (Timestamp)</th><td>${timestampText}</td></tr>
      <tr><th>Trạng thái quyền học (Enrollment Status)</th><td>ACTIVE (Đã kích hoạt vĩnh viễn)</td></tr>
    </table>
    <div class="no-print" style="text-align:right;">
      <button onclick="window.print()" style="padding:10px 18px;font-weight:800;border:2px solid #111;background:#d6ff41;cursor:pointer;">IN / LƯU PDF BIÊN NHẬN</button>
    </div>
    <div class="footer">Learnova LMS — Hệ thống Quản lý Học tập Trực tuyến · Biên nhận điện tử hợp lệ.</div>
  </div>
  <script>setTimeout(() => window.print(), 300);</script>
</body>
</html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="payment-result-page">
      <button className="back" onClick={backToCourse}>
        ← Quay lại chi tiết khóa học
      </button>

      <CheckoutStepper activeStep={3} />

      <div className={`receipt-banner ${isPaid ? "success" : "pending"}`}>
        <div className="receipt-banner-icon">
          <CheckCircle2 size={38} />
        </div>
        <div>
          <span className="kicker">
            {isPaid ? "XÁC NHẬN GIAO DỊCH HOÀN TẤT" : "TRẠNG THÁI ĐƠN HÀNG"}
          </span>
          <h1>
            {isPaid
              ? "Payment & Enrollment Successful! — Thanh toán thành công!"
              : `Trạng thái đơn hàng: ${payment.status}`}
          </h1>
          <p>
            {isPaid
              ? "Hệ thống LMS đã xác minh giao dịch từ cổng thanh toán và mở khóa toàn bộ bài giảng cho tài khoản của bạn."
              : "Đơn hàng đang chờ xác nhận hoặc đã kết thúc. Bạn có thể kiểm tra chi tiết bên dưới."}
          </p>
        </div>
      </div>

      <div className="receipt-card">
        <div className="receipt-card-header">
          <div>
            <span className="kicker">BIÊN NHẬN ĐIỆN TỬ</span>
            <h2>Chi tiết giao dịch (Transaction Receipt)</h2>
          </div>
          <Tag color={isPaid ? "green" : "gold"} style={{ fontWeight: 800 }}>
            {isPaid ? "ACTIVE · SẴN SÀNG VÀO HỌC" : payment.status}
          </Tag>
        </div>

        <div className="receipt-rows">
          <div className="receipt-row">
            <span>Tên khóa học (Course Name)</span>
            <strong>{targetCourse.title || "Khóa học Learnova"}</strong>
          </div>
          <div className="receipt-row">
            <span>Học viên ghi danh (Student)</span>
            <strong>
              {user?.name || payment.student?.name || "Học viên"}{" "}
              {user?.email ? `(${user.email})` : ""}
            </strong>
          </div>
          <div className="receipt-row">
            <span>Mã đơn hàng LMS (Order Code)</span>
            <div className="receipt-copy-val">
              <code>{payment.paymentCode || "FREE-ORDER"}</code>
              {payment.paymentCode && (
                <CopyButton value={payment.paymentCode} />
              )}
            </div>
          </div>
          <div className="receipt-row">
            <span>Mã giao dịch cổng thanh toán (PayOS Transaction ID)</span>
            <div className="receipt-copy-val">
              <code>
                {payment.transactionReference || "TXN-PAYOS-VERIFIED"}
              </code>
              {payment.transactionReference && (
                <CopyButton value={payment.transactionReference} />
              )}
            </div>
          </div>
          {discountAmount > 0 && (
            <div className="receipt-row">
              <span>Giá gốc / Mã khuyến mãi</span>
              <strong>
                {originalAmount.toLocaleString("vi-VN")} ₫ (Giảm{" "}
                {discountAmount.toLocaleString("vi-VN")} ₫ · Mã:{" "}
                {payment.voucherCode})
              </strong>
            </div>
          )}
          <div className="receipt-row highlight">
            <span>Số tiền đã thanh toán (Amount Paid)</span>
            <strong>{paidAmount.toLocaleString("vi-VN")} ₫</strong>
          </div>
          <div className="receipt-row">
            <span>Thời điểm thanh toán (Payment Timestamp)</span>
            <strong>{timestampText}</strong>
          </div>
          <div className="receipt-row">
            <span>Trạng thái ghi danh (Enrollment Status)</span>
            <strong>
              <Tag color="green">ACTIVE (Ready to study)</Tag>
            </strong>
          </div>
        </div>

        <div className="receipt-actions">
          {isPaid && (
            <button
              type="button"
              className="primary"
              onClick={() => startLearningNow(targetCourse)}
            >
              <Play size={16} /> Bắt đầu học ngay (Start Learning Now)
            </button>
          )}
          <button
            type="button"
            className="outline"
            onClick={handleDownloadReceipt}
          >
            <Download size={16} /> Tải biên nhận PDF (Download Receipt)
          </button>
          <button
            type="button"
            className="outline"
            onClick={() => go("learning")}
          >
            <GraduationCap size={16} /> Đến Khóa học đã mua (My Enrolled
            Courses)
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * MÀN HÌNH 4.1 — COURSE DETAILS & ENROLLMENT SCREEN
 * Hiển thị thông tin chi tiết khóa học, kết quả học tập, quyền lợi khóa học,
 * danh sách chương/bài học (Curriculum), xem thử miễn phí và khu vực Checkout.
 */
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
  applyVoucher,
  simulatePayment,
  openReceipt,
  startLearningNow,
  busy,
  reviewDraft,
  setReviewDraft,
  onLockedLesson,
}) {
  const modulesList = detail?.content || [];
  const allLessons = modulesList.flatMap((m) => m.lessons || []);
  const totalLessons = allLessons.length;
  const totalMinutes = allLessons.reduce(
    (sum, l) => sum + (Number(l.durationMinutes) || 15),
    0,
  );
  const salePrice = Number(selected.price || 0);
  const referenceOriginalPrice =
    salePrice > 0 ? Math.round((salePrice * 1.4) / 1000) * 1000 : 0;

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
          <div className="hero-badges-row">
            <span className="kicker">{selected.category || "KHÓA HỌC"}</span>
            {(selected.enrollmentCount >= 1 ||
              (selected.rating != null && Number(selected.rating) >= 4.5)) && (
              <span className="kicker badge-bestseller">
                <Sparkles size={11} /> BESTSELLER
              </span>
            )}
            <span className="kicker badge-level">
              CẤP ĐỘ: {selected.level || "BEGINNER"}
            </span>
          </div>

          <h1>{selected.title}</h1>
          <p>
            {selected.description || "Khám phá kiến thức mới cùng Learnova."}
          </p>

          <div className="course-meta">
            <span>
              <BookOpen size={16} /> {modulesList.length} module ·{" "}
              {totalLessons} bài học
            </span>
            <span>
              <Clock size={16} /> {totalMinutes} phút thời lượng
            </span>
            <span>
              <Users size={16} /> Giảng viên:{" "}
              {selected.teacher?.name || "Giảng viên Learnova"}
            </span>
            <span>
              <Star
                size={16}
                fill={selected.rating != null ? "currentColor" : "none"}
              />
              {selected.rating != null
                ? `${Number(selected.rating).toFixed(1)} (${selected.reviewCount || 0} đánh giá)`
                : "Chưa có đánh giá"}
            </span>
            <span>
              <GraduationCap size={16} /> {selected.enrollmentCount || 0} học
              viên đã đăng ký
            </span>
          </div>

          {!teacher && (
            <div className="course-pricing-strip">
              <div className="price-main">
                <span className="price-label">HỌC PHÍ KHÓA HỌC:</span>
                <strong className="sale-price">
                  {salePrice === 0
                    ? "MIỄN PHÍ (0 ₫)"
                    : `${salePrice.toLocaleString("vi-VN")} ₫`}
                </strong>
                {salePrice > 0 && (
                  <>
                    <del className="orig-price">
                      {referenceOriginalPrice.toLocaleString("vi-VN")} ₫
                    </del>
                    <span className="discount-tag">Ưu đãi học viên</span>
                  </>
                )}
              </div>
              {detail?.access && (
                <span className="enrolled-chip">
                  <CheckCircle2 size={15} /> ĐÃ GHI DANH · ACTIVE
                </span>
              )}
            </div>
          )}

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
                {detail?.access ? (
                  <>
                    <button
                      className="primary"
                      onClick={() =>
                        startLearningNow && startLearningNow(selected)
                      }
                    >
                      <Play size={16} /> Vào học ngay / Tiếp tục bài học
                    </button>
                    <button
                      className="outline"
                      onClick={() => go("learning")}
                    >
                      <GraduationCap size={16} /> Xem tiến độ tại Khóa học đã
                      mua
                    </button>
                  </>
                ) : (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={checkout}
                  >
                    <Wallet size={17} />{" "}
                    {salePrice === 0
                      ? "Ghi danh miễn phí"
                      : `Mua khóa học · ${salePrice.toLocaleString("vi-VN")} ₫`}
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

      {/* KHU VỰC CHECKOUT VIETQR PAYOS KHI ĐANG CÓ ĐƠN THANH TOÁN */}
      {payment && !payment.free && (
        <PaymentCard
          selected={selected}
          user={user}
          payment={payment}
          payRemaining={payRemaining}
          cancelPayment={cancelPayment}
          applyVoucher={applyVoucher}
          simulatePayment={simulatePayment}
          openReceipt={openReceipt}
          busy={busy}
        />
      )}

      {/* KHỐI OVERVIEW: BẠN SẼ HỌC ĐƯỢC GÌ & QUYỀN LỢI KHÓA HỌC */}
      <div className="course-overview-grid">
        <div className="overview-box">
          <span className="kicker">MỤC TIÊU ĐẦU RA (WHAT YOU WILL LEARN)</span>
          <h3>Bạn sẽ đạt được gì sau khóa học này?</h3>
          <ul className="outcomes-list">
            <li>
              <Check size={16} />
              <span>
                Nắm vững kiến thức nền tảng và tư duy cốt lõi của chuyên đề{" "}
                <b>{selected.title}</b>.
              </span>
            </li>
            <li>
              <Check size={16} />
              <span>
                Thực hành từng bước qua {totalLessons || 2} bài học chi tiết
                được biên soạn bài bản bởi {selected.teacher?.name || "giảng viên"}.
              </span>
            </li>
            <li>
              <Check size={16} />
              <span>
                Áp dụng kiến thức vào bài tập thực tế và tự đánh giá năng lực
                qua hệ thống Quiz trắc nghiệm tự động.
              </span>
            </li>
            <li>
              <Check size={16} />
              <span>
                Xây dựng nền tảng vững chắc cho các đồ án chuyên ngành thuộc
                lĩnh vực {selected.category || "Công nghệ thông tin"}.
              </span>
            </li>
          </ul>
        </div>

        <div className="overview-box inclusions-box">
          <span className="kicker">QUYỀN LỢI BAO GỒM (COURSE INCLUSIONS)</span>
          <h3>Quyền lợi khi ghi danh khóa học</h3>
          <ul className="inclusions-list">
            <li>
              <Video size={16} />
              <span>
                <b>{totalMinutes} phút</b> bài giảng lý thuyết, video và tài
                liệu chuyên sâu
              </span>
            </li>
            <li>
              <Layers size={16} />
              <span>
                <b>{modulesList.length} chương (modules)</b> với{" "}
                <b>{totalLessons} bài học</b> có lộ trình rõ ràng
              </span>
            </li>
            <li>
              <ShieldCheck size={16} />
              <span>
                Kích hoạt tự động tức thì 24/7 qua cổng{" "}
                <b>VietQR / PayOS Gateway</b>
              </span>
            </li>
            <li>
              <Award size={16} />
              <span>
                Truy cập trọn đời trên cả máy tính và thiết bị di động, lưu vết
                tiến độ từng bài học
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* DANH SÁCH CHƯƠNG & BÀI HỌC (COURSE CURRICULUM) */}
      <div className="section-heading">
        <div>
          <span className="kicker">CHƯƠNG TRÌNH ĐÀO TẠO (CURRICULUM)</span>
          <h2>Nội dung khóa học</h2>
        </div>
        {teacher && selected?.teacher?.id === user?.id ? (
          <button
            className="outline"
            onClick={() => {
              setManage({ courseId: selected.id });
              setPage("t-modules");
            }}
          >
            <Layers size={16} /> Quản lý module
          </button>
        ) : (
          <span className="curriculum-summary">
            {modulesList.length} chương · {totalLessons} bài học · Tổng thời
            lượng {totalMinutes} phút
          </span>
        )}
      </div>

      <div className="module-list">
        {modulesList.map(({ module, lessons: ls }, i) => {
          const modMinutes = (ls || []).reduce(
            (acc, item) => acc + (Number(item.durationMinutes) || 15),
            0,
          );
          return (
            <div className="module-card" key={module.id}>
              <div className="module-heading">
                <div>
                  <span className="module-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <b>{module.title}</b>
                    {module.description && (
                      <p className="module-desc">{module.description}</p>
                    )}
                  </div>
                </div>
                <span className="module-meta-tag">
                  {(ls || []).length} bài · {modMinutes} phút
                </span>
              </div>
              {ls.map((l, lIdx) => {
                const isDone = progress.some((p) => p.lessonId === l.id);
                const isPreviewable = i === 0 && lIdx === 0;
                return (
                  <div className="lesson" key={l.id}>
                    {detail?.access ? (
                      <Play size={15} />
                    ) : (
                      <Lock size={15} />
                    )}
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
                      {isDone && <Tag color="green">Hoàn thành</Tag>}
                      {!detail?.access && isPreviewable && (
                        <Tag color="blue">Giới thiệu</Tag>
                      )}
                    </span>
                    <small className="lesson-duration">
                      <FileText size={12} /> {l.contentType || "TEXT"} ·{" "}
                      {l.durationMinutes || 15} phút
                    </small>
                  </div>
                );
              })}
            </div>
          );
        })}
        {!modulesList.length && <Empty text="Khóa học chưa có nội dung." />}
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
