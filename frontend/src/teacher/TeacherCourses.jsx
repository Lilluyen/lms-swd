import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  message,
} from "antd";
import {
  BookOpen,
  Layers,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { api, del } from "../api";
import { LEVEL_LABEL, PAGE_SIZE, STATUS, day, money } from "./shared";

export function TeacherCourses({
  onCreate,
  onCopilot,
  onManage,
  onEdit,
  onView,
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(
      () => {
        setLoading(true);
        api(
          `/teacher/courses?q=${encodeURIComponent(q.trim())}&status=${status}&page=${page}&size=${PAGE_SIZE}`,
        )
          .then((r) => {
            if (!alive) return;
            setData(r);
            setError("");
          })
          .catch((e) => alive && setError(e.message))
          .finally(() => alive && setLoading(false));
      },
      q ? 300 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, status, page]);

  const remove = (row) =>
    Modal.confirm({
      title: "Xóa khóa học?",
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            <b>{row.title}</b> và toàn bộ module, bài học bên trong sẽ bị xóa
            vĩnh viễn.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Khóa học đã có học viên ghi danh sẽ không thể xóa.
          </p>
        </div>
      ),
      okText: "Xóa khóa học",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        setBusyId(row.id);
        try {
          await del(`/teacher/courses/${row.id}`);
          message.success("Đã xóa khóa học");
          setPage((p) => (data.items.length === 1 && p > 0 ? p - 1 : p));
          setQ((v) => v + "");
          setStatus((v) => v);
          setData((d) => ({
            ...d,
            items: d.items.filter((x) => x.id !== row.id),
          }));
          // Reload the page slice so numbering stays correct.
          const r = await api(
            `/teacher/courses?q=${encodeURIComponent(q.trim())}&status=${status}&page=${page}&size=${PAGE_SIZE}`,
          );
          setData(r);
        } catch (e) {
          message.error(e.message);
          throw e;
        } finally {
          setBusyId(null);
        }
      },
    });

  return (
    <>
      <div className="t-head">
        <div className="page-title" style={{ marginBottom: 0 }}>
          <span className="kicker">DÀNH CHO GIÁO VIÊN</span>
          <h1>Khóa học của tôi</h1>
          <p>Tạo, sắp xếp và xuất bản nội dung bài giảng của bạn.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button
            size="large"
            icon={<Sparkles size={16} />}
            onClick={onCopilot}
            style={{
              borderColor: "#6366f1",
              color: "#6366f1",
              fontWeight: 500,
            }}
          >
            Tạo bằng AI Gemini
          </Button>
          <Button
            data-testid="create-course"
            type="primary"
            size="large"
            icon={<Plus size={16} />}
            onClick={onCreate}
          >
            Tạo khóa học
          </Button>
        </div>
      </div>

      <div className="t-toolbar">
        <Input
          allowClear
          size="large"
          maxLength={100}
          prefix={<Search size={16} />}
          placeholder="Tìm theo tiêu đề khóa học (tối đa 100 ký tự)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        <Select
          size="large"
          value={status}
          style={{ width: 190 }}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
          options={[{ value: "ALL", label: "Tất cả trạng thái" }, ...STATUS]}
        />
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          closable
          onClose={() => setError("")}
          style={{ marginBottom: 16 }}
        />
      )}

      {loading ? (
        <div className="teacher-course-grid" aria-label="Đang tải khóa học">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="teacher-course-card course-card-skeleton"
              key={index}
            >
              <Skeleton.Image active />
              <div className="teacher-course-card-body">
                <Skeleton active paragraph={{ rows: 3 }} />
              </div>
            </div>
          ))}
        </div>
      ) : data.items.length ? (
        <div className="teacher-course-grid">
          {data.items.map((course, index) => (
            <article className="teacher-course-card" key={course.id}>
              <button
                type="button"
                className={`teacher-course-cover cover${index % 3}`}
                onClick={() => onView(course)}
                aria-label={`Xem khóa học ${course.title}`}
              >
                <img
                  src={course.cover || "/images/course-cover-default.png"}
                  alt={`Ảnh bìa khóa học ${course.title}`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src =
                      "/images/course-cover-default.png";
                  }}
                />
                <span
                  className={
                    "course-status-badge " +
                    (course.status === "PUBLISHED" ? "published" : "draft")
                  }
                >
                  {course.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </button>

              <div className="teacher-course-card-body">
                <div className="teacher-course-eyebrow">
                  <span>{course.category || "Chưa phân loại"}</span>
                  <span>{LEVEL_LABEL[course.level] || course.level}</span>
                </div>
                <button
                  type="button"
                  className="teacher-course-title"
                  onClick={() => onView(course)}
                >
                  {course.title}
                </button>
                <p>{course.description || "Khóa học chưa có mô tả."}</p>

                <div
                  className="teacher-course-rating"
                  aria-label={
                    course.rating != null
                      ? `Đánh giá ${course.rating} trên 5`
                      : "Chưa có đánh giá"
                  }
                >
                  <Star
                    size={15}
                    fill={course.rating != null ? "currentColor" : "none"}
                    aria-hidden="true"
                  />
                  {course.rating != null ? (
                    <>
                      <strong>{Number(course.rating).toFixed(1)}</strong>
                      <span>({course.reviewCount || 0} đánh giá)</span>
                    </>
                  ) : (
                    <span>Chưa có đánh giá</span>
                  )}
                </div>

                <div className="teacher-course-facts">
                  <span>
                    <Layers size={14} aria-hidden="true" /> {course.moduleCount}{" "}
                    module
                  </span>
                  <span>
                    <BookOpen size={14} aria-hidden="true" />{" "}
                    {course.lessonCount} bài học
                  </span>
                  <span>Cập nhật {day(course.updatedAt)}</span>
                </div>

                <div className="teacher-course-price">
                  {money(course.price)}
                </div>
              </div>

              <div className="teacher-course-actions">
                <Button
                  type="primary"
                  className="btn-manage-content"
                  icon={<BookOpen size={15} />}
                  onClick={() => onManage(course)}
                >
                  Quản lý nội dung
                </Button>
                <Button
                  icon={<Pencil size={15} />}
                  aria-label={`Sửa ${course.title}`}
                  onClick={() => onEdit(course)}
                >
                  Sửa
                </Button>
                <Button
                  danger
                  icon={<Trash2 size={15} />}
                  aria-label={`Xóa ${course.title}`}
                  loading={busyId === course.id}
                  onClick={() => remove(course)}
                >
                  Xóa
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="teacher-course-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              q || status !== "ALL"
                ? "Không có khóa học nào khớp bộ lọc."
                : "Bạn chưa tạo khóa học nào."
            }
          />
          {!q && status === "ALL" && (
            <Button type="primary" icon={<Plus size={16} />} onClick={onCreate}>
              Tạo khóa học đầu tiên
            </Button>
          )}
        </div>
      )}

      {!loading && data.total > 0 && (
        <div className="teacher-course-pagination">
          <span>
            Hiển thị {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, data.total)} trong {data.total}{" "}
            khóa học
          </span>
          <Pagination
            current={page + 1}
            pageSize={PAGE_SIZE}
            total={data.total}
            showSizeChanger={false}
            onChange={(next) => setPage(next - 1)}
          />
        </div>
      )}
    </>
  );
}
