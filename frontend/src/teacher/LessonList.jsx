import React from "react";
import { Button, Tag } from "antd";
import { FileText, Pencil, Plus, Trash2, Video } from "lucide-react";

/** Lesson panel inside an expanded module on the module board. */
export function LessonList({
  moduleId,
  lessons,
  onEditLesson,
  onAddLesson,
  onRemoveLesson,
}) {
  return (
    <div className="lesson-panel">
      {lessons.length ? (
        lessons.map((l) => (
          <div className="lesson-item" key={l.id}>
            <span className="lesson-icon">
              {l.contentType === "VIDEO" ? (
                <Video size={15} />
              ) : (
                <FileText size={15} />
              )}
            </span>
            <span className="lesson-order">{l.position}</span>
            <button
              type="button"
              className="lesson-name"
              onClick={() => onEditLesson(moduleId, l.id)}
            >
              {l.title}
            </button>
            <Tag>{l.contentType}</Tag>
            {l.durationMinutes ? (
              <span className="muted">{l.durationMinutes} phút</span>
            ) : null}
            <Button
              size="small"
              type="text"
              icon={<Pencil size={14} />}
              onClick={() => onEditLesson(moduleId, l.id)}
            />
            <Button
              size="small"
              type="text"
              danger
              icon={<Trash2 size={14} />}
              onClick={() => onRemoveLesson(l)}
            />
          </div>
        ))
      ) : (
        <p className="muted" style={{ margin: "8px 0" }}>
          Module chưa có bài học nào.
        </p>
      )}
      <Button
        size="small"
        type="dashed"
        icon={<Plus size={14} />}
        onClick={() => onAddLesson(moduleId)}
        style={{ marginTop: 10 }}
      >
        Thêm bài học
      </Button>
    </div>
  );
}
