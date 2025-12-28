import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Paperclip,
  Camera,
  Send,
  X,
  Plus,
  MessageSquareText,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

const AiBotPage = () => {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const scrollRef = useRef(null);

  // ----- 모바일 감지 -----
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const byWidth = window.matchMedia("(max-width: 768px)").matches;
      const byTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobile(byWidth || byTouch);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ----- 세션 관리 -----
  const newSession = () => ({
    id: Date.now(),
    title: "새 대화",
    messages: [
      { role: "ai", content: "안녕하세요! 무엇을 도와드릴까요?" },
      { role: "ai", content: "파일/사진을 올리거나 질문을 입력해 주세요." },
    ],
    createdAt: new Date().toISOString(),
  });

  const [sessions, setSessions] = useState([newSession()]);
  const [activeId, setActiveId] = useState(sessions[0].id);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) || sessions[0],
    [sessions, activeId]
  );

  const messages = activeSession?.messages ?? [];

  // ----- 입력/로딩/파일 -----
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);

  const previews = useMemo(() => {
    return files.map((f) => ({
      file: f,
      url: f.type?.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, loading]);

  const pushMessage = (role, content, extra = {}) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s;

        let nextTitle = s.title;
        if (role === "user" && (s.title === "새 대화" || !s.title)) {
          nextTitle = content.replace(/\s+/g, " ").slice(0, 18);
          if (content.length > 18) nextTitle += "…";
        }

        return {
          ...s,
          title: nextTitle,
          messages: [...s.messages, { role, content, ...extra }],
        };
      })
    );
  };

  const addFiles = (newFiles) => {
    if (!newFiles?.length) return;
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of newFiles) {
        const exists = merged.some((x) => x.name === f.name && x.size === f.size);
        if (!exists) merged.push(f);
      }
      return merged;
    });
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));
  const clearFiles = () => setFiles([]);

  const createSession = () => {
    const s = newSession();
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setFiles([]);
    setInput("");
  };

  const deleteSession = (id) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next.length ? next : [newSession()];
    });

    if (activeId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining[0]) setActiveId(remaining[0].id);
    }
  };

  // ----- AI 요청 -----
  const askAi = async () => {
    if (loading) return;

    const question = input.trim();
    if (!question && files.length === 0) return;

    const userText =
      (question ? question : "(질문 없음)") +
      (files.length ? `\n📎 첨부: ${files.map((f) => f.name).join(", ")}` : "");

    pushMessage("user", userText);

    setInput("");
    setLoading(true);

    try {
      if (files.length === 0) {
        const res = await axiosInstance.post("/api/rag/ask", {
          sessionId: activeId,
          question,
        });

        pushMessage("ai", res.data?.answer ?? "(답변이 비어있습니다)", {
          references: res.data?.references ?? [],
        });
        return;
      }

      const form = new FormData();
      form.append("sessionId", String(activeId));
      form.append("question", question || "");
      files.forEach((f) => form.append("files", f));

      const res = await axiosInstance.post("/api/rag/ask-with-file", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      pushMessage("ai", res.data?.answer ?? "(답변이 비어있습니다)", {
        references: res.data?.references ?? [],
      });

      clearFiles();
    } catch (err) {
      console.error("AI 요청 실패:", err);
      pushMessage("ai", "⚠️ 답변 생성 중 오류가 발생했습니다.\n(네트워크/서버 로그를 확인해 주세요.)");
    } finally {
      setLoading(false);
    }
  };

  // ----- UI 조각 -----
  const TopBar = () => (
    <div
      className="bg-white border-bottom"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="container" style={{ maxWidth: 1100 }}>
        <div className="d-flex align-items-center justify-content-between py-3">
          <button className="btn btn-link text-decoration-none" onClick={() => navigate(-1)}>
            <ArrowLeft className="me-2" />
            뒤로
          </button>

          <div className="fw-bold" style={{ color: "#059669" }}>
            홈스캐너 AI 비서
          </div>

          <div style={{ width: 64 }} />
        </div>
      </div>
    </div>
  );

  const Bubble = ({ role, children }) => {
    const isUser = role === "user";
    return (
      <div className="mb-3 d-flex" style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}>
        <div
          className="shadow-sm"
          style={{
            maxWidth: "82%",
            padding: "12px 14px",
            borderRadius: 18,
            background: isUser ? "#059669" : "white",
            color: isUser ? "white" : "#0f172a",
            whiteSpace: "pre-wrap",
            lineHeight: 1.4,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            border: isUser ? "none" : "1px solid #eef2f7",
          }}
        >
          {children}
        </div>
      </div>
    );
  };

  const AttachPreview = () => {
    if (files.length === 0) return null;

    return (
      <div className="px-3 pb-2">
        <div className="bg-white border rounded-4 p-2">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="small text-secondary">첨부파일</div>
            <button className="btn btn-sm btn-outline-danger" onClick={clearFiles}>
              전체삭제
            </button>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            {previews.map((p, idx) => (
              <div key={idx} className="position-relative" style={{ width: 92 }}>
                <button
                  className="btn btn-sm btn-dark position-absolute"
                  style={{
                    top: 4,
                    right: 4,
                    borderRadius: 999,
                    padding: "2px 6px",
                    zIndex: 2,
                  }}
                  onClick={() => removeFile(idx)}
                  title="삭제"
                >
                  <X size={14} />
                </button>

                {p.url ? (
                  <img
                    src={p.url}
                    alt={p.file.name}
                    style={{
                      width: 92,
                      height: 92,
                      objectFit: "cover",
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                ) : (
                  <div
                    className="d-flex align-items-center justify-content-center text-center"
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      background: "#f1f5f9",
                      fontSize: 11,
                      padding: 6,
                    }}
                  >
                    {p.file.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ChatArea = () => (
    <div
      ref={scrollRef}
      className="p-3"
      style={{
        height: isMobile ? "calc(100vh - 210px)" : "calc(100vh - 180px)",
        overflowY: "auto",
        overflowX: "hidden", // 가로 잘림/스크롤 방지
        background: "#f8fafc",
      }}
    >
      {messages.map((m, idx) => (
        <Bubble key={idx} role={m.role}>
          {m.content}
          {m.role === "ai" && Array.isArray(m.references) && m.references.length > 0 && (
            <div className="mt-3 pt-3 border-top" style={{ fontSize: 12, color: "#64748b" }}>
              <div className="fw-bold mb-1">참고</div>
              <ul className="mb-0 ps-3">
                {m.references.map((r, i) => (
                  <li key={i}>{typeof r === "string" ? r : JSON.stringify(r)}</li>
                ))}
              </ul>
            </div>
          )}
        </Bubble>
      ))}

      {loading && (
        <Bubble role="ai">
          답변 생성 중...
        </Bubble>
      )}
    </div>
  );

  const InputBar = () => (
    <div className="bg-white border-top">
      <div className="container" style={{ maxWidth: 1100 }}>
        <AttachPreview />

        <div className="p-3">
          <div className="d-flex gap-2 align-items-center">
            <button
              className="btn btn-outline-secondary rounded-circle"
              onClick={() => fileInputRef.current?.click()}
              title="파일 업로드"
              disabled={loading}
            >
              <Paperclip />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="d-none"
              onChange={(e) => addFiles(Array.from(e.target.files || []))}
            />

            {isMobile && (
              <>
                <button
                  className="btn btn-outline-secondary rounded-circle"
                  onClick={() => cameraInputRef.current?.click()}
                  title="카메라 촬영"
                  disabled={loading}
                >
                  <Camera />
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="d-none"
                  onChange={(e) => addFiles(Array.from(e.target.files || []))}
                />
              </>
            )}

            <input
              className="form-control"
              style={{ borderRadius: 14 }}
              placeholder={isMobile ? "질문을 입력하세요… (사진/파일 가능)" : "메시지를 입력하세요… (파일 첨부 가능)"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAi()}
              disabled={loading}
            />

            <button
              className="btn text-white d-flex align-items-center justify-content-center"
              style={{ background: "#059669", borderRadius: 14, width: 48, height: 42 }}
              onClick={askAi}
              disabled={loading}
              title="전송"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="small text-muted mt-2">
            {isMobile
              ? "모바일: 카메라 촬영 후 바로 질문할 수 있어요."
              : "PC: ChatGPT처럼 대화 목록과 채팅 화면으로 이용할 수 있어요."}
          </div>
        </div>
      </div>
    </div>
  );

  // ----- PC 레이아웃: 가운데 정렬된 카드형 2컬럼 -----
  const DesktopLayout = () => (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <TopBar />

      <div className="container py-4" style={{ maxWidth: 1100 }}>
        <div
          className="row g-3"
          style={{
            marginLeft: 0,
            marginRight: 0,
          }}
        >
          {/* 좌측: 대화 리스트 카드 */}
          <div className="col-12 col-lg-4">
            <div className="bg-white border rounded-4 shadow-sm overflow-hidden">
              <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                <div className="fw-bold d-flex align-items-center" style={{ color: "#059669" }}>
                  <MessageSquareText className="me-2" />
                  대화
                </div>
                <button className="btn btn-sm btn-outline-success" onClick={createSession}>
                  <Plus size={16} className="me-1" />
                  새 대화
                </button>
              </div>

              <div style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
                {sessions.map((s) => {
                  const active = s.id === activeId;
                  return (
                    <div
                      key={s.id}
                      className="px-3 py-2 border-bottom"
                      style={{
                        cursor: "pointer",
                        background: active ? "#ecfdf5" : "white",
                      }}
                      onClick={() => {
                        setActiveId(s.id);
                        setFiles([]);
                        setInput("");
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="fw-semibold" style={{ fontSize: 14 }}>
                          {s.title || "대화"}
                        </div>
                        <button
                          className="btn btn-sm btn-link text-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(s.id);
                          }}
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {new Date(s.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3">
                <button className="btn btn-outline-secondary w-100" onClick={() => navigate(-1)}>
                  <ArrowLeft size={18} className="me-2" />
                  홈으로
                </button>
              </div>
            </div>
          </div>

          {/* 우측: 채팅 카드 */}
          <div className="col-12 col-lg-8" style={{ minWidth: 0 }}>
            <div className="bg-white border rounded-4 shadow-sm overflow-hidden" style={{ minWidth: 0 }}>
              <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold" style={{ color: "#059669" }}>
                    홈스캐너 AI 비서
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {activeSession?.title}
                  </div>
                </div>
                <div className="text-muted small">PC 모드</div>
              </div>

              {/* 채팅 */}
              <ChatArea />
            </div>
          </div>
        </div>
      </div>

      {/* 입력바는 하단 고정 느낌으로 */}
      <InputBar />
    </div>
  );

  // ----- 모바일: 풀스크린 단일 카드 느낌 -----
  const MobileLayout = () => (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <TopBar />
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="bg-white border rounded-4 shadow-sm overflow-hidden mt-3">
          <div className="p-3 border-bottom">
            <div className="fw-bold" style={{ color: "#059669" }}>
              홈스캐너 AI 비서
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              파일/사진을 올리고 질문하세요
            </div>
          </div>
          <ChatArea />
        </div>
      </div>
      <InputBar />
    </div>
  );

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
};

export default AiBotPage;
