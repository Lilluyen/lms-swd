import React from "react";
import {
  CourseEditor,
  LessonEditor,
  ModuleBoard,
  TeacherCourses,
} from "../teacher";

export function TeacherWorkspace({
  page,
  manage,
  setManage,
  refresh,
  go,
  setPage,
  openCourse,
}) {
  return (
    <>
      {page === "t-courses" && (
        <TeacherCourses
          onCreate={() => {
            setManage({});
            setPage("t-course-form");
          }}
          onEdit={(r) => {
            setManage({ courseId: r.id });
            setPage("t-course-form");
          }}
          onManage={(r) => {
            setManage({ courseId: r.id });
            setPage("t-modules");
          }}
          onView={(r) => openCourse(r)}
        />
      )}
      {page === "t-course-form" && (
        <CourseEditor
          courseId={manage.courseId}
          onSaved={() => {
            refresh();
            go("t-courses");
          }}
          onCancel={() => go("t-courses")}
        />
      )}
      {page === "t-modules" && manage.courseId && (
        <ModuleBoard
          courseId={manage.courseId}
          onBack={() => go("t-courses")}
          onAddLesson={(moduleId) => {
            setManage({ ...manage, moduleId, lessonId: null });
            setPage("t-lesson-form");
          }}
          onEditLesson={(moduleId, lessonId) => {
            setManage({ ...manage, moduleId, lessonId });
            setPage("t-lesson-form");
          }}
        />
      )}
      {page === "t-lesson-form" && manage.courseId && manage.moduleId && (
        <LessonEditor
          courseId={manage.courseId}
          moduleId={manage.moduleId}
          lessonId={manage.lessonId}
          onDone={() => setPage("t-modules")}
          onCancel={() => setPage("t-modules")}
        />
      )}
    </>
  );
}
