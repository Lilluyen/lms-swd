import React from "react";
import { BookOpen, ChevronRight, LogOut, Menu, Sparkles, Users } from "lucide-react";

export function Sidebar({ menuOpen, user, nav, page, go, logout }) {
  const items = user ? nav : [["catalog", "Khám phá khóa học", BookOpen]];
  return (
    <aside className={`sidebar ${menuOpen ? "visible" : ""}`}>
      <div className="brand" onClick={() => go("home")}>
        <div className="brand-icon"><BookOpen size={21} /></div>
        learnova<span>.</span>
      </div>
      <div className="side-label">KHÔNG GIAN HỌC TẬP</div>
      <nav>
        {items.map(([id, label, Icon]) => (
          <button key={id} className={page === id ? "active" : ""} onClick={() => go(id)}>
            <Icon size={19} />{label}
          </button>
        ))}
      </nav>
      <div className="side-bottom">
        <div className="mini-card">
          <Sparkles size={21} /><b>Học theo cách của bạn</b>
          <span>Kiến thức mới bắt đầu từ một câu hỏi.</span>
        </div>
        {user ? (
          <button className="logout" onClick={logout}><LogOut size={18} /> Đăng xuất</button>
        ) : (
          <button className="logout" onClick={() => go("auth")}><Users size={18} /> Đăng nhập</button>
        )}
      </div>
    </aside>
  );
}

export function Header({ menuOpen, setMenuOpen, user, nav, page, go }) {
  const pageLabel = page === "home" ? "Trang chủ" : {
    "t-course-form": "Khóa học",
    "t-modules": "Modules",
    "t-lesson-form": "Bài học",
    "edit-lesson": "Bài học",
    "edit-module": "Modules",
  }[page] || nav.find((item) => item[0] === page)?.[1] || "Chi tiết";
  return (
    <header>
      <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button>
      <div className="breadcrumbs">Không gian học tập <ChevronRight size={15} /> <strong>{pageLabel}</strong></div>
      <div className="header-right">
        <span className="today"><Sparkles size={13} /> LEARNING, REIMAGINED</span>
        <div className="avatar" onClick={() => go(user ? "profile" : "auth")}>
          {user?.name?.slice(0, 1)?.toUpperCase() || "G"}
        </div>
      </div>
    </header>
  );
}
