import React from "react";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  GraduationCap,
  Search,
  Sparkles,
} from "lucide-react";
import { CourseGrid, PageTitle, Stat } from "../components/common";

export function HomePage({ courses, quizzes, user, go, openCourse }) {
  return (
    <>
      <div className="home-intro">
        <span className="kicker">NỀN TẢNG HỌC TẬP THÔNG MINH</span>
        <h1>
          Học nhanh hơn. <span>Nhớ lâu hơn.</span>
        </h1>
        <p>
          Khóa học do giáo viên biên soạn, câu hỏi luyện tập do AI hỗ trợ và
          tiến độ được theo dõi theo từng bài học.
        </p>
        <div className="hero-actions">
          <button className="primary" onClick={() => go("catalog")}>
            Khám phá khóa học <ArrowRight size={16} />
          </button>
          <button
            className="outline"
            onClick={() => go(user ? "dashboard" : "auth")}
          >
            {user ? "Vào không gian học tập" : "Bắt đầu miễn phí"}
          </button>
        </div>
      </div>

      <div className="stats">
        <Stat icon={BookOpen} label="Khóa học" value={courses.length} />
        <Stat
          icon={BrainCircuit}
          label="Quiz luyện tập"
          value={quizzes.length}
        />
        <Stat
          icon={GraduationCap}
          label="Giáo viên biên soạn"
          value={
            new Set(courses.map((c) => c.teacher?.id).filter(Boolean)).size
          }
        />
      </div>
      <div className="section-heading">
        <div>
          <span className="kicker">DÀNH CHO BẠN</span>
          <h2>Khóa học nổi bật</h2>
        </div>
        <button className="text-button" onClick={() => go("catalog")}>
          Xem tất cả <ArrowRight size={17} />
        </button>
      </div>
      <CourseGrid items={courses.slice(0, 3)} open={openCourse} />
    </>
  );
}

export function CatalogPage({ courses, form, setForm, openCourse }) {
  return (
    <>
      <PageTitle
        kicker="KHÁM PHÁ"
        title="Tìm khóa học phù hợp"
        desc="Học điều bạn yêu thích cùng những nội dung chất lượng."
      />
      <div className="search">
        <Search size={18} />
        <input
          placeholder="Tìm theo tên khóa học..."
          value={form.search || ""}
          onChange={(e) => setForm({ ...form, search: e.target.value })}
        />
      </div>
      <CourseGrid
        items={courses.filter((c) =>
          c.title?.toLowerCase().includes((form.search || "").toLowerCase()),
        )}
        open={openCourse}
      />
    </>
  );
}

export function AuthPage({
  mode,
  setMode,
  form,
  setForm,
  busy,
  signin,
  setError,
}) {
  return (
    <div className="auth-wrap">
      <div className="auth-visual">
        <Sparkles size={34} />
        <h2>Kiến thức ở trong tầm tay.</h2>
        <p>Đăng nhập để tiếp tục hành trình của bạn.</p>
        <div className="auth-shape" />
      </div>
      <div className="auth-form">
        <span className="kicker">CHÀO MỪNG ĐẾN VỚI LEARNOVA</span>
        <h2>{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</h2>
        <p className="muted">
          {mode === "login"
            ? "Vui lòng nhập thông tin để tiếp tục."
            : "Bắt đầu hành trình học tập ngay hôm nay."}
        </p>
        {mode === "register" && (
          <>
            <label>Họ và tên</label>
            <input
              placeholder="Nguyễn Văn A"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <label>Vai trò</label>
            <select
              value={form.role || "STUDENT"}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="STUDENT">Học viên</option>
              <option value="TEACHER">Giáo viên</option>
            </select>
          </>
        )}
        <label>Email</label>
        <input
          type="email"
          placeholder="ban@example.com"
          value={form.email || ""}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <label>Mật khẩu</label>
        <input
          type="password"
          placeholder="Tối thiểu 8 ký tự"
          value={form.password || ""}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="primary wide" disabled={busy} onClick={signin}>
          {mode === "login" ? "Đăng nhập" : "Đăng ký"} <ArrowRight size={17} />
        </button>
        <div className="divider">hoặc</div>
        <a className="google" href="/oauth2/authorization/google">
          <span>G</span> Tiếp tục với Google
        </a>
        <p className="switch">
          {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
          </button>
        </p>
      </div>
    </div>
  );
}
