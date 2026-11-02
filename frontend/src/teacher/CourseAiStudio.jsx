import React, { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BookOpen,
  Bot,
  Clock,
  FileText,
  Layers,
  Send,
  Sparkles,
  User,
  Video,
  File,
  CheckCircle,
} from "lucide-react";
import { post } from "../api";
import { Crumb, LEVEL_LABEL } from "./shared";

const { Text, Paragraph } = Typography;

const SUGGESTIONS = [
  "Tạo khóa học Spring Boot 3 và MySQL thực chiến cho sinh viên năm 3",
  "Tạo khóa học React 19 & Tailwind CSS xây dựng Dashboard trong 4 tuần",
  "Tạo khóa học Lập trình Python từ con số 0 cho người mới bắt đầu",
  "Tạo khóa học Thiết kế UI/UX và Design System với Figma",
];

export function CourseAiStudio({ onSaved, onCancel }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Xin chào thầy/cô! Em là trợ lý AI chuyên thiết kế chương trình đào tạo. Thầy/cô muốn tạo khóa học về chủ đề gì, dành cho đối tượng nào và trong khoảng thời gian bao lâu ạ? Thầy/cô có thể chọn nhanh gợi ý bên dưới hoặc nhắn trực tiếp yêu cầu.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [draft, setDraft] = useState(null);
  const [chatting, setChatting] = useState(false);
  const [saving, setSaving] = useState(false);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatting]);

  const sendMessage = async (customText) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || chatting) return;

    const newMessages = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    if (!customText) setInputMessage("");
    setChatting(true);

    try {
      const history = newMessages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await post("/teacher/ai/chat-course", {
        message: textToSend,
        history,
        currentDraft: draft,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply || "Đã cập nhật dàn ý khóa học." },
      ]);

      if (res.draft) {
        setDraft(res.draft);
      }
    } catch (e) {
      message.error(e.message || "Không thể kết nối tới dịch vụ AI");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Có lỗi xảy ra: ${e.message}. Vui lòng thử lại.`,
        },
      ]);
    } finally {
      setChatting(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!draft || saving) return;
    if (!draft.title || draft.title.trim().length < 5) {
      message.error("Tên khóa học phải có ít nhất 5 ký tự");
      return;
    }

    setSaving(true);
    try {
      const res = await post("/teacher/ai/create-course-from-draft", draft);
      message.success(
        `Đã tạo khóa học "${res.title}" thành công với ${res.moduleCount} module và ${res.lessonCount} bài học!`,
      );
      onSaved?.(res.id);
    } catch (e) {
      message.error(e.message || "Không thể tạo khóa học từ bản nháp");
    } finally {
      setSaving(false);
    }
  };

  const moduleCount = draft?.modules?.length || 0;
  const lessonCount =
    draft?.modules?.reduce(
      (sum, m) => sum + (m.lessons?.length || 0),
      0,
    ) || 0;

  return (
    <>
      <Crumb
        items={[
          { label: "Khóa học của tôi", onClick: onCancel },
          { label: "Tạo khóa học bằng AI Copilot" },
        ]}
      />

      <div className="page-title" style={{ marginBottom: 16 }}>
        <span className="kicker">AI INSTRUCTIONAL DESIGNER</span>
        <h1>Trợ lý AI sáng tạo khóa học (Course Copilot)</h1>
        <p>
          Hội thoại cùng AI để lên dàn ý khung chương trình, tự động sinh các Module
          và Bài học có cấu trúc sẵn trước khi lưu vào hệ thống.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(350px, 42%) 1fr",
          gap: 20,
          alignItems: "start",
          minHeight: 650,
        }}
      >
        {/* Left Column: AI Chat Panel */}
        <div
          className="panel"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "750px",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-color, #e5e7eb)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--card-head-bg, #f9fafb)",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                AI Course Copilot
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Hỗ trợ thiết kế & tối ưu sư phạm
              </div>
            </div>
          </div>

          {/* Messages list */}
          <div
            style={{
              flex: 1,
              padding: 20,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#e0e7ff",
                        color: "#4f46e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Bot size={16} />
                    </div>
                  )}
                  <div
                    style={{
                      background: isUser ? "var(--primary-color, #4f46e5)" : "#f3f4f6",
                      color: isUser ? "#fff" : "#1f2937",
                      padding: "10px 14px",
                      borderRadius: 14,
                      borderTopRightRadius: isUser ? 2 : 14,
                      borderTopLeftRadius: !isUser ? 2 : 14,
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {chatting && (
              <div style={{ display: "flex", gap: 10, alignSelf: "flex-start" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#e0e7ff",
                    color: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={16} />
                </div>
                <div
                  style={{
                    background: "#f3f4f6",
                    padding: "10px 14px",
                    borderRadius: 14,
                    fontSize: 13,
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Sparkles size={14} className="spin-slow" />
                  AI đang phác thảo dàn ý khóa học…
                </div>
              </div>
            )}
            <div ref={chatScrollRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div
              style={{
                padding: "8px 16px",
                background: "#fafafa",
                borderTop: "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6b7280",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Gợi ý chủ đề nhanh:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(s)}
                    disabled={chatting}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 16,
                      padding: "4px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      color: "#374151",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                  >
                    ✨ {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div
            style={{
              padding: 16,
              borderTop: "1px solid var(--border-color, #e5e7eb)",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <Input.TextArea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Nhắn yêu cầu (ví dụ: 'Thêm 1 bài về Docker vào Module 3', 'Giảm bớt thời lượng')..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                disabled={chatting}
              />
              <Button
                type="primary"
                icon={<Send size={16} />}
                onClick={() => sendMessage()}
                loading={chatting}
                disabled={!inputMessage.trim()}
                style={{ height: "auto", minWidth: 46 }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Course Canvas */}
        <div
          className="panel"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "750px",
            padding: 0,
            overflow: "hidden",
          }}
        >
          {/* Canvas Header */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--border-color, #e5e7eb)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--card-head-bg, #f9fafb)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                📋 Dàn ý khóa học (Live Course Outline)
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Xem trước cấu trúc modules & bài học do AI thiết kế
              </div>
            </div>

            {draft && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Tag color="blue">{moduleCount} Modules</Tag>
                <Tag color="purple">{lessonCount} Bài học</Tag>
                {draft.level && (
                  <Tag color="green">{LEVEL_LABEL[draft.level] || draft.level}</Tag>
                )}
              </div>
            )}
          </div>

          {/* Canvas Body */}
          <div
            style={{
              flex: 1,
              padding: 24,
              overflowY: "auto",
              background: "#fafafa",
            }}
          >
            {!draft ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                }}
              >
                <Empty
                  description={
                    <span style={{ color: "#6b7280", fontSize: 14 }}>
                      Chưa có dàn ý khóa học. Hãy trò chuyện với AI ở khung bên
                      trái để bắt đầu tạo!
                    </span>
                  }
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Course Metadata Card */}
                <Card
                  style={{
                    borderRadius: 10,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                  bodyStyle={{ padding: 18 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 19,
                        color: "#111827",
                        fontWeight: 700,
                      }}
                    >
                      {draft.title || "Chưa đặt tên"}
                    </h2>
                    {draft.category && (
                      <Tag color="cyan">{draft.category}</Tag>
                    )}
                  </div>
                  <Paragraph
                    ellipsis={{ rows: 3, expandable: true, symbol: "Xem thêm" }}
                    style={{ color: "#4b5563", margin: "6px 0 10px", fontSize: 14 }}
                  >
                    {draft.description || "Chưa có mô tả."}
                  </Paragraph>
                  {draft.context && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#166534",
                      }}
                    >
                      💡 <b>Ngữ cảnh:</b> {draft.context}
                    </div>
                  )}
                </Card>

                {/* Modules & Lessons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "#374151",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Layers size={16} /> CÁC MODULE VÀ BÀI HỌC DỰ KIẾN:
                  </div>

                  {draft.modules?.map((m, mIdx) => (
                    <Card
                      key={mIdx}
                      size="small"
                      style={{
                        borderRadius: 8,
                        borderColor: "#e5e7eb",
                      }}
                      title={
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              background: "#e0e7ff",
                              color: "#4338ca",
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 12,
                            }}
                          >
                            Module {mIdx + 1}
                          </span>
                          <span>{m.title}</span>
                        </div>
                      }
                      extra={
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          {m.lessons?.length || 0} bài học
                        </span>
                      }
                    >
                      {m.description && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "#6b7280",
                            marginBottom: 10,
                            fontStyle: "italic",
                          }}
                        >
                          {m.description}
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {m.lessons?.map((les, lIdx) => (
                          <div
                            key={lIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "#f9fafb",
                              padding: "8px 12px",
                              borderRadius: 6,
                              fontSize: 13,
                              border: "1px solid #f3f4f6",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flex: 1,
                              }}
                            >
                              <span style={{ color: "#9ca3af", fontSize: 12 }}>
                                {mIdx + 1}.{lIdx + 1}
                              </span>
                              {les.contentType === "VIDEO" ? (
                                <Video size={14} color="#ef4444" />
                              ) : les.contentType === "FILE" ? (
                                <File size={14} color="#f59e0b" />
                              ) : (
                                <FileText size={14} color="#3b82f6" />
                              )}
                              <span style={{ fontWeight: 500, color: "#374151" }}>
                                {les.title}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              {les.durationMinutes && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#6b7280",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 3,
                                  }}
                                >
                                  <Clock size={12} /> {les.durationMinutes}p
                                </span>
                              )}
                              <Tag style={{ fontSize: 11, margin: 0 }}>
                                {les.contentType || "TEXT"}
                              </Tag>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Canvas Footer Actions */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border-color, #e5e7eb)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fff",
            }}
          >
            <Button size="large" onClick={onCancel} disabled={saving}>
              Quay lại
            </Button>

            <Button
              type="primary"
              size="large"
              icon={<Sparkles size={16} />}
              loading={saving}
              disabled={!draft || !draft.title || saving}
              onClick={handleCreateCourse}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                borderColor: "transparent",
              }}
            >
              Tạo khóa học vào hệ thống (1-Click)
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
