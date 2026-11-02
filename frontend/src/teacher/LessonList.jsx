import React from "react";
import { Button, Tag } from "antd";
import { FileText, Pencil, Plus, Sparkles, Trash2, Video } from "lucide-react";

/** Lesson panel inside an expanded module on the module board. */
export function LessonList({
  moduleId,
  moduleItem,
  lessons,
  onEditLesson,
  onAddLesson,
  onRemoveLesson,
  onAiBatchLessons,
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
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <Button
          size="small"
          type="dashed"
          icon={<Plus size={14} />}
          onClick={() => onAddLesson(moduleId)}
        >
          Thêm bài học
        </Button>
        {onAiBatchLessons && (
          <Button
            size="small"
            icon={<Sparkles size={14} />}
            onClick={() => onAiBatchLessons(moduleItem || { id: moduleId })}
            style={{ borderColor: "#6366f1", color: "#6366f1" }}
          >
            AI sinh loạt bài học
          </Button>
        )}
      </div>
    </div>
  );
}
