import React from "react";
import { ArrowRight, BookOpen, BrainCircuit, ClipboardList, Sparkles } from "lucide-react";
import { CourseGrid, Stat } from "../components/common";

export function DashboardPage({
  user,
  teacher,
  mine,
  quizzes,
  questions,
  results,
  courses,
  go,
  openCourse,
}) {
  return (
    <>
      <div className="welcome">
        <div>
          <span className="kicker">HÀNH TRÌNH CỦA BẠN</span>
          <h1>
            Chào {user?.name || "bạn"} <Sparkles size={22} className="spark" />
          </h1>
          <p>Hôm nay là một ngày tuyệt vời để học thêm điều mới.</p>
        </div>
        <button
          className="primary"
          onClick={() => go(teacher ? "t-courses" : "catalog")}
        >
          {teacher ? "Quản lý khóa học" : "Khám phá khóa học"}{" "}
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="stats">
        <Stat
          icon={BookOpen}
          label={teacher ? "Khóa học đã tạo" : "Khóa học đã mua"}
          value={mine.length}
        />
        <Stat
          icon={BrainCircuit}
          label={teacher ? "Quiz đã tạo" : "Quiz của tôi"}
          value={quizzes.length}
        />
        <Stat
          icon={ClipboardList}
          label={teacher ? "Câu hỏi đã tạo" : "Lượt luyện tập"}
          value={teacher ? questions.length : results.length}
        />
      </div>
      <div className="section-heading">
        <div>
          <span className="kicker">
            {teacher ? "QUẢN LÝ NỘI DUNG" : "TIẾP TỤC KHÁM PHÁ"}
          </span>
          <h2>{teacher ? "Khóa học của tôi" : "Khóa học dành cho bạn"}</h2>
        </div>
      </div>
      <CourseGrid
        items={(teacher ? mine : courses).slice(0, 3)}
        open={openCourse}
      />
    </>
  );
}
