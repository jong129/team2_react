// src/components/aichatbot/MiniChatBot.jsx
import React, { useEffect, useRef, useState } from "react";
import { MessageSquareText, X, ArrowRight, MessageCircle, Plus, Trash2, ThumbsUp, ThumbsDown, RefreshCcw, Copy } from "lucide-react";
import { axiosInstance } from "../Tool";
import "./MiniChatBot.css";

const DEFAULT_MESSAGES = [
  { role: "ai", content: "안녕하세요! 무엇을 도와드릴까요?" },
  { role: "ai", content: "문서분석/체크리스트 결과를 기반으로 이어서 질문해도 돼요." },
];

const normalizeRole = (role) => {
  if (!role) return "ai";
  const r = String(role).toLowerCase();
  if (r === "user") return "user";
  if (r === "assistant" || r === "ai") return "ai";
  return "ai";
};

const normalizeMessages = (serverMessages) => {
  if (!Array.isArray(serverMessages)) return [];
  return serverMessages.map((m) => ({
    role: normalizeRole(m.role),
    content: m.content ?? "",
    references: m.references ?? [],

    // ✅ 서버가 내려주는 chatId / 집계 / 내 피드백까지 받기
    chatId: m.chatId ?? m.id ?? m.chat_id ?? null,
    likeCount: m.likeCount ?? 0,
    dislikeCount: m.dislikeCount ?? 0,
    myFeedback: m.myFeedback ?? null,
  }));
};


// grouped DTO -> flat sessions (최근 목록용)
const flattenGroupedSessions = (data) => {
  // AiBotPage에서 쓰는 DTO와 동일 가정: [{date, sessions:[{sessionId,title,...}]}]
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const g of data) {
    const sessions = Array.isArray(g.sessions) ? g.sessions : (Array.isArray(g.items) ? g.items : []);
    for (const s of sessions) out.push(s);
  }
  return out;
};


export default function MiniChatbot({ isLoggedIn }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ✅ 현재 세션
  const [sessionId, setSessionId] = useState(null);

  // ✅ 최근 세션 목록 (드롭다운)
  const [recentSessions, setRecentSessions] = useState([]); // [{sessionId,title,lastMessageAt,...}]
  const [loadingSessions, setLoadingSessions] = useState(false);

  // ✅ 채팅 상태
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isChatOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isChatOpen]);

  // -----------------------------
  // API helpers
  // -----------------------------
  const loadRecentSessions = async () => {
    setLoadingSessions(true);
    try {
      // ✅ 이미 AiBotPage가 쓰는 endpoint 재사용
      const res = await axiosInstance.get("/api/chat/sessions/grouped");
      const flat = flattenGroupedSessions(res.data);
      // 너무 많으면 UX 안 좋아서 상위 15개만
      setRecentSessions(flat.slice(0, 15));
    } catch (e) {
      console.warn("최근 세션 목록 로드 실패(미니챗):", e);
      setRecentSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMessagesBySession = async (sid) => {
    const mres = await axiosInstance.get(`/api/chat/sessions/${sid}/messages`, {
      params: { limit: 50 },
    });
    const loaded = normalizeMessages(mres.data.messages);
    setMessages(loaded.length > 0 ? loaded : DEFAULT_MESSAGES);
  };

  const ensureLatestSession = async () => {
    // ✅ 최근 세션 id 가져오기(없으면 생성) - 기존 로직 유지
    const sres = await axiosInstance.post("/api/chat/sessions/latest");
    const sid = sres.data.sessionId;
    setSessionId(sid);
    return sid;
  };

  // ✅ "진짜 새 세션" 생성 시도
  // - 서버에 생성 API가 있으면 그걸 쓰고
  // - 없으면(404 등) 화면만 새 대화처럼 초기화(fallback)
  const createNewSession = async () => {
    try {
      // 1) 가장 일반적인 생성 엔드포인트들 “순차 시도”
      //    (백엔드 구현명이 다를 수 있어 현실적으로 이렇게 해두면 편합니다)
      const candidates = [
        { method: "post", url: "/api/chat/sessions" },
        { method: "post", url: "/api/chat/sessions/new" },
        { method: "post", url: "/api/chat/sessions/create" },
      ];

      for (const c of candidates) {
        try {
          const res = await axiosInstance[c.method](c.url, {});
          const sid = res?.data?.sessionId ?? res?.data?.id;
          if (sid != null) {
            setSessionId(sid);
            setMessages(DEFAULT_MESSAGES);
            await loadRecentSessions();
            return sid;
          }
        } catch (err) {
          console.warn(`[세션 생성 실패] ${c.method.toUpperCase()} ${c.url}`, err);
          // 다음 후보로 계속
        }
      }

      // 2) 후보가 전부 실패하면 fallback: 화면만 새 대화처럼
      setSessionId(null);
      setMessages(DEFAULT_MESSAGES);
      alert("⚠️ 서버에 '새 세션 생성 API'가 없어 화면만 새 대화로 초기화했습니다.\n(백엔드에 세션 생성 엔드포인트 추가 시 완전 지원 가능)");
      return null;
    } catch (e) {
      console.error("새 세션 생성 실패:", e);
      alert("새 대화 시작에 실패했습니다. (서버 로그 확인)");
      return null;
    }
  };

  const deleteCurrentSession = async () => {
    if (!sessionId) {
      // fallback 상태(세션 없음)면 그냥 초기화
      setMessages(DEFAULT_MESSAGES);
      return;
    }

    const ok = window.confirm(`현재 대화(세션 #${sessionId})를 삭제할까요?`);
    if (!ok) return;

    try {
      // ✅ AiBotPage에서 이미 쓰는 endpoint
      await axiosInstance.delete(`/api/chat/sessions/${sessionId}`);

      // 삭제 후: 최신 세션으로 이동(없으면 생성)
      const sid = await ensureLatestSession();
      await loadMessagesBySession(sid);
      await loadRecentSessions();
    } catch (e) {
      console.error("세션 삭제 실패:", e);
      alert("삭제에 실패했습니다. (권한/서버 로그 확인)");
    }
  };

  const copyText = async (text) => {
    try {
      // 1) 최신 API 사용 가능 + 보안 컨텍스트(https/localhost)일 때
      if (navigator?.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        alert("복사되었습니다!");
        return;
      }

      // 2) fallback: execCommand 방식 (구형/권한제한/HTTP에서도 동작하는 경우 많음)
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();

      const ok = document.execCommand("copy");
      document.body.removeChild(ta);

      if (!ok) throw new Error("execCommand copy failed");
      alert("복사되었습니다!");
    } catch (err) {
      console.error("복사 실패:", err);
      alert("복사에 실패했습니다. (브라우저 권한/HTTPS 환경을 확인하세요)");
    }
  };


  const sendFeedback = async (chatId, liked) => {
    const res = await axiosInstance.post(`/api/chat/messages/${chatId}/feedback`, { liked });

    const { likeCount, dislikeCount, myFeedback } = res.data;

    setMessages(prev =>
      prev.map(m =>
        m.chatId === chatId
          ? { ...m, likeCount, dislikeCount, myFeedback }
          : m
      )
    );
  };

  const regenerate = async () => {
    if (loading) return;

    // 마지막 user 질문 찾기
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;

    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/rag/ask", {
        sessionId,
        question: lastUser.content,
        regenerate: true, // 서버에서 temperature 올리는 용도로(선택)
      });

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: res.data.answer ?? "(답변이 비어있습니다)",
          chatId: res.data.assistantChatId,   // ✅ 중요
          likeCount: 0,
          dislikeCount: 0,
          myFeedback: null,
          references: res.data.references ?? [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // open/toggle
  // -----------------------------
  const openChatAndLoad = async () => {
    try {
      await loadRecentSessions();

      const sid = await ensureLatestSession();
      await loadMessagesBySession(sid);
    } catch (err) {
      console.error("세션/기록 로드 실패:", err);
      setMessages([
        { role: "ai", content: "⚠️ 이전 대화를 불러오지 못했습니다. 새로 대화를 시작할 수 있어요." },
      ]);
    }
  };

  const openFromEvent = async () => {
    if (!isLoggedIn) {
      alert("AI 비서 기능은 로그인이 필요합니다.");
      return;
    }
    setIsChatOpen(true);
    await openChatAndLoad();
  };

  // ✅ Home(또는 어디서든) 'open-mini-chat' 이벤트가 오면 챗봇 열기
  useEffect(() => {
    const handler = () => openFromEvent();
    window.addEventListener("open-mini-chat", handler);
    return () => window.removeEventListener("open-mini-chat", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const toggleChat = async () => {
    if (!isLoggedIn) {
      alert("AI 비서 기능은 로그인이 필요합니다.");
      return;
    }

    if (isChatOpen) {
      setIsChatOpen(false);
      return;
    }

    setIsChatOpen(true);
    await openChatAndLoad();
  };

  // -----------------------------
  // chat
  // -----------------------------
  const askAi = async () => {
    if (!input.trim() || loading) return;

    // ✅ sessionId가 없으면(=fallback 새대화) 먼저 최신 세션 확보 후 진행
    let sid = sessionId;
    if (!sid) {
      sid = await ensureLatestSession();
      await loadRecentSessions();
    }

    const question = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await axiosInstance.post("/api/rag/ask", {
        sessionId: sid,
        question,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: res.data.answer ?? "(답변이 비어있습니다)",
          references: res.data.references ?? [],
          chatId: res.data.assistantChatId, // ✅ 추가
          likeCount: 0,
          dislikeCount: 0,
          myFeedback: null,
        },
      ]);


      // 메시지 쌓였으니 최근 세션 목록도 갱신(너무 자주 싫으면 throttle 가능)
      await loadRecentSessions();
    } catch (err) {
      console.error("AI 요청 실패:", err);
      setMessages((prev) => [...prev, { role: "ai", content: "⚠️ 답변 생성 중 오류가 발생했습니다." }]);
    } finally {
      setLoading(false);
    }
  };

  const changeSession = async (sid) => {
    if (!sid) return;
    try {
      setSessionId(sid);
      setMessages([{ role: "ai", content: "불러오는 중..." }]);
      await loadMessagesBySession(sid);
    } catch (e) {
      console.error("세션 전환 실패:", e);
      setMessages([{ role: "ai", content: "⚠️ 대화를 불러오지 못했습니다." }]);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed-bottom d-flex justify-content-end p-4" style={{ zIndex: 1050, pointerEvents: "none" }}>
        <button
          onClick={toggleChat}
          className="btn btn-emerald rounded-circle shadow-lg d-flex align-items-center justify-content-center hover-scale"
          style={{
            width: "64px",
            height: "64px",
            pointerEvents: "auto",
            backgroundColor: isChatOpen ? "#1e293b" : "#059669",
            border: "none",
          }}
        >
          {isChatOpen ? <X size={32} color="white" /> : <MessageCircle size={32} color="white" />}
        </button>
      </div>

      {/* Chat Window */}
      {isChatOpen && (
        <div
          className="card shadow-2xl border-0 animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{
            position: "fixed",
            bottom: "100px",
            right: "24px",
            width: "360px",
            height: "520px",
            zIndex: 1050,
            borderRadius: "24px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* header */}
          <div className="p-3 text-white" style={{ backgroundColor: "#059669" }}>
            {/* 1행: 타이틀 + 닫기 */}
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                <MessageSquareText size={20} className="me-2" />
                <span
                  className="fw-bold"
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "220px", // ✅ 폭 제한 (겹침 방지)
                  }}
                  title="홈스캐너 AI 비서"
                >
                  홈스캐너 AI 비서
                </span>
              </div>

              <button
                onClick={() => setIsChatOpen(false)}
                className="btn btn-link text-white p-0"
                title="닫기"
                style={{ flex: "0 0 auto" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 2행: 세션 드롭다운 + 버튼들 */}
            <div className="d-flex align-items-center gap-2 mt-2">
              <select
                className="form-select form-select-sm"
                style={{ flex: 1, borderRadius: 12, minWidth: 0 }}
                value={sessionId ?? ""}
                onChange={(e) => changeSession(e.target.value)}
                title="최근 대화로 이동"
                disabled={loadingSessions}
              >
                <option value="" disabled>
                  {loadingSessions ? "불러오는 중..." : "세션 선택"}
                </option>
                {recentSessions.map((s) => {
                  const sid = s.sessionId ?? s.id;
                  const title = s.title || `세션 #${sid}`;
                  return (
                    <option key={sid} value={sid}>
                      {title}
                    </option>
                  );
                })}
              </select>

              {/* 새 대화 */}
              <button
                className="btn btn-sm btn-light"
                style={{ borderRadius: 12, flex: "0 0 auto" }}
                onClick={createNewSession}
                title="새 대화(새 세션)"
                disabled={loading}
              >
                <Plus size={16} />
              </button>

              {/* 삭제 */}
              <button
                className="btn btn-sm btn-light"
                style={{ borderRadius: 12, flex: "0 0 auto" }}
                onClick={deleteCurrentSession}
                title="현재 대화 삭제"
                disabled={loading}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* body */}
          <div className="flex-grow-1 p-3 bg-light overflow-auto" style={{ fontSize: "0.9rem" }}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isAi = msg.role === "ai";

              return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                  <div
                    className="p-3 rounded-4 mb-1 shadow-sm"
                    style={{
                      maxWidth: "85%",
                      backgroundColor: isUser ? "#059669" : "#ffffff",
                      color: isUser ? "white" : "black",
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* ✅ AI 답변 액션 */}
                  {isAi && msg.chatId && (
                    <div className="msg-actions" style={{ maxWidth: "85%" }}>
                      <button
                        type="button"
                        className={`action-icon ${msg.myFeedback === 1 ? "active like" : ""}`}
                        onClick={() => sendFeedback(msg.chatId, true)}
                        title="좋아요"
                        aria-label="좋아요"
                      >
                        <ThumbsUp size={18} />
                      </button>

                      <button
                        type="button"
                        className={`action-icon ${msg.myFeedback === -1 ? "active dislike" : ""}`}
                        onClick={() => sendFeedback(msg.chatId, false)}
                        title="싫어요"
                        aria-label="싫어요"
                      >
                        <ThumbsDown size={18} />
                      </button>

                      <button
                        type="button"
                        className="action-icon"
                        onClick={regenerate}
                        title="다시작성"
                        aria-label="다시작성"
                        disabled={loading}
                      >
                        <RefreshCcw size={18} />
                      </button>

                      <button
                        type="button"
                        className="action-icon"
                        onClick={() => copyText(msg.content)}
                        title="복사"
                        aria-label="복사"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  )}


                </div>
              );
            })}


            {loading && (
              <div className="p-3 rounded-4 bg-white shadow-sm">
                AI가 답변을 생성 중입니다...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* footer input */}
          <div className="p-3 border-top bg-white">
            <div className="input-group">
              <input
                type="text"
                className="form-control border-0 bg-light"
                placeholder="메시지를 입력하세요..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) askAi();
                }}
                disabled={loading}
              />
              <button className="btn btn-emerald" onClick={askAi} disabled={loading}>
                <ArrowRight size={18} color="white" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-emerald { background-color: #059669; border: none; transition: all 0.3s; }
        .btn-emerald:hover { background-color: #047857; transform: translateY(-2px); }
        .hover-scale:hover { transform: scale(1.02); transition: 0.2s; }
        .animate-in { animation: slideUp 0.3s ease-out forwards; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
