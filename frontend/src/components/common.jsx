import React from "react";
import { Empty as AntEmpty, Tooltip, message } from "antd";
import { ArrowUpRight, Copy, Star } from "lucide-react";

export function Field({ label, value, set, type = "text", area = false }) {
  return (
    <>
      <label>{label}</label>
      {area ? (
        <textarea value={value || ""} onChange={(e) => set(e.target.value)} rows={5} />
      ) : (
        <input type={type} value={value ?? ""} onChange={(e) => set(e.target.value)} />
      )}
    </>
  );
}

export function PageTitle({ kicker, title, desc }) {
  return (
    <div className="page-title">
      <span className="kicker">{kicker}</span>
      <h1>{title}</h1>
      {desc && <p>{desc}</p>}
    </div>
  );
}

export function Empty({ text }) {
  return <div className="empty"><AntEmpty description={text} /></div>;
}

export function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat">
      <div className="stat-icon"><Icon size={22} /></div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

export function CopyButton({ value }) {
  return (
    <Tooltip title="Sao chép">
      <button
        type="button"
        className="copy-button"
        aria-label="Sao chép"
        onClick={() => {
          navigator.clipboard.writeText(String(value || ""));
          message.success("Đã sao chép");
        }}
      >
        <Copy size={14} />
      </button>
    </Tooltip>
  );
}

export function CourseGrid({ items, open }) {
  if (!items?.length) return <Empty text="Chưa có khóa học nào để hiển thị." />;
  return (
    <div className="course-grid">
      {items.map((course, index) => (
        <button className="course-card" key={course.id} onClick={() => open(course)}>
          <div className={`course-cover cover${index % 3}`}>
            <img
              src={course.cover || "/images/course-cover-default.png"}
              alt={`Ảnh bìa khóa học ${course.title}`}
              loading="lazy"
              onError={(event) => { event.currentTarget.src = "/images/course-cover-default.png"; }}
            />
            <span className="cover-open"><ArrowUpRight size={16} /></span>
          </div>
          <div className="course-card-body">
            <span className="kicker">{course.category || "KHÓA HỌC"}</span>
            <h3>{course.title}</h3>
            <p>{course.description || "Khám phá những kiến thức mới."}</p>
            <div className="course-rating">
              <Star size={15} fill={course.rating != null ? "currentColor" : "none"} aria-hidden="true" />
              {course.rating != null ? (
                <><strong>{Number(course.rating).toFixed(1)}</strong><span>({course.reviewCount || 0})</span></>
              ) : <span>Chưa có đánh giá</span>}
            </div>
            <div className="course-footer">
              <span>{course.teacher?.name || "Giáo viên"}</span>
              <b>{Number(course.price || 0) === 0 ? "Miễn phí" : `${Number(course.price).toLocaleString("vi-VN")} ₫`}</b>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
