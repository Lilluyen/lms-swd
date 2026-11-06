import React from 'react';
import { Button, Input, Tag } from 'antd';
import { Save, Sparkles } from 'lucide-react';
import { Field } from './shared';

/** Step 3 of the AI question studio: review, edit and save drafts. */
export function QuestionDraftList({
  drafts,
  selected,
  onSelect,
  onUpdateDraft,
  onDiscardAll,
  onLeave,
  onSave,
  saving,
}) {
  return (
    <section className="question-ai-results" aria-labelledby="draft-title">
      <div className="results-head">
        <div>
          <span className="step-number">3</span>
          <div>
            <h2 id="draft-title">Duyệt câu hỏi</h2>
            <p>
              {drafts.length
                ? `${drafts.length} bản nháp · đã chọn ${selected.length}`
                : 'Kết quả sẽ xuất hiện tại đây'}
            </p>
          </div>
        </div>
        {!!drafts.length && (
          <Button danger type="text" onClick={onDiscardAll}>
            Bỏ tất cả
          </Button>
        )}
      </div>
      {!drafts.length ? (
        <div className="ai-empty">
          <Sparkles size={28} />
          <h3>Chưa có bản nháp</h3>
          <p>
            Điền tiêu chí và nội dung bài học, sau đó bấm “Tạo bản nháp câu
            hỏi”.
          </p>
        </div>
      ) : (
        drafts.map((draft, index) => (
          <article
            className={`question-draft-card ${selected.includes(index) ? 'selected' : ''}`}
            key={draft.draftId || index}
          >
            <div className="draft-card-head">
              <label className="draft-select">
                <input
                  type="checkbox"
                  checked={selected.includes(index)}
                  onChange={(e) => onSelect(index, e.target.checked)}
                />
                <span>Chọn câu {index + 1}</span>
              </label>
              <div>
                <Tag color="purple">Multiple Choice</Tag>
                <Tag
                  color={
                    { EASY: 'green', MEDIUM: 'gold', HARD: 'red' }[
                      draft.difficulty
                    ]
                  }
                >
                  {draft.difficulty}
                </Tag>
              </div>
            </div>
            <Field label="Nội dung câu hỏi" required>
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 5 }}
                value={draft.content}
                onChange={(e) =>
                  onUpdateDraft(index, { content: e.target.value })
                }
              />
            </Field>
            <div className="draft-answers">
              {draft.answers?.map((answer, answerIndex) => (
                <div className="draft-answer" key={answerIndex}>
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={!!answer.correct}
                    aria-label={`Đặt đáp án ${answerIndex + 1} là đáp án đúng`}
                    onChange={() =>
                      onUpdateDraft(index, {
                        answers: draft.answers.map((item, currentIndex) => ({
                          ...item,
                          correct: currentIndex === answerIndex,
                        })),
                      })
                    }
                  />
                  <span>{String.fromCharCode(65 + answerIndex)}</span>
                  <Input
                    style={{
                      width: '100%',
                      minWidth: 0,
                      padding: '10px',
                      flex: 1,
                    }}
                    value={answer.content}
                    onChange={(e) =>
                      onUpdateDraft(index, {
                        answers: draft.answers.map((item, currentIndex) =>
                          currentIndex === answerIndex
                            ? { ...item, content: e.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <Field label="Giải thích đáp án">
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                value={draft.explanation}
                onChange={(e) =>
                  onUpdateDraft(index, { explanation: e.target.value })
                }
              />
            </Field>
            <div className="context-reference">
              <strong>Căn cứ trong bài học</strong>
              <p>“{draft.contextReference}”</p>
            </div>
          </article>
        ))
      )}
      {!!drafts.length && (
        <div className="results-actions">
          <Button onClick={onLeave}>Hủy</Button>
          <Button
            type="primary"
            size="large"
            icon={<Save size={16} />}
            loading={saving}
            disabled={!selected.length || saving}
            onClick={onSave}
          >
            Thêm {selected.length || 0} câu đã chọn
          </Button>
        </div>
      )}
    </section>
  );
}
