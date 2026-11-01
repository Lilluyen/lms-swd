import React from "react";
import { Button, Empty } from "antd";
import { GripVertical, Layers, Pencil, Trash2 } from "lucide-react";
import { LessonList } from "./LessonList";

/** Draggable module list with expandable lesson panels. */
export function ModuleList({
  modules,
  loading,
  dragId,
  overId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  openLessons,
  lessons,
  onToggleLessons,
  onEditModule,
  onRemoveModule,
  onEditLesson,
  onAddLesson,
  onRemoveLesson,
}) {
  if (loading) {
    return (
      <div className="skeleton-list">
        {[0, 1, 2].map((i) => (
          <div className="skeleton-row" key={i} />
        ))}
      </div>
    );
  }
  if (!modules.length) {
    return <Empty description="Khóa học chưa có module nào. Hãy thêm module đầu tiên." />;
  }

  return (
    <div className="mod-list">
      {modules.map((m, i) => (
        <div key={m.id}>
          <div
            className={
              "mod-row" +
              (dragId === m.id ? " dragging" : "") +
              (overId === m.id && dragId !== m.id ? " over" : "")
            }
            draggable
            onDragStart={() => onDragStart(m.id)}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver(m.id);
            }}
            onDragLeave={() => onDragLeave(m.id)}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(m.id);
            }}
          >
            <span className="drag-handle" title="Kéo để đổi thứ tự">
              <GripVertical size={18} />
            </span>
            <span className="mod-order">{i + 1}</span>
            <div className="mod-main">
              <b>{m.title}</b>
              {m.description && <span className="muted">{m.description}</span>}
            </div>
            <span className="mod-count">{m.lessonCount || 0} bài học</span>
            <div className="row-actions">
              <Button
                size="small"
                icon={<Layers size={14} />}
                onClick={() => onToggleLessons(m.id)}
              >
                Lessons
              </Button>
              <Button
                size="small"
                type="text"
                icon={<Pencil size={14} />}
                onClick={() => onEditModule(m)}
              />
              <Button
                size="small"
                type="text"
                danger
                icon={<Trash2 size={14} />}
                onClick={() => onRemoveModule(m)}
              />
            </div>
          </div>

          {openLessons === m.id && (
            <LessonList
              moduleId={m.id}
              lessons={lessons[m.id] || []}
              onEditLesson={onEditLesson}
              onAddLesson={onAddLesson}
              onRemoveLesson={onRemoveLesson}
            />
          )}
        </div>
      ))}
    </div>
  );
}
