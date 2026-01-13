// src/components/aichatbot/MiniChatBot.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  MessageSquareText,
  X,
  ArrowRight,
  MessageCircle,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  Copy,
  Bug,
} from "lucide-react";
import { axiosInstance, getSseBaseUrl } from "../Tool";
import "./MiniChatBot.css";

const DEFAULT_MESSAGES = [
  {
    role: "ai",
    content: "안녕하세요! 부동산 계약과 관련된 궁금증을 도와드리는 AI 비서입니다.",
    followUpQuestions: [
      "내 상황을 설명하면 어떤 점을 조심해야 하는지 알려줄 수 있어?",
      "전세계약할 때 사람들이 가장 많이 놓치는 위험한 포인트는 뭐야?",
      "안전하게 계약하려면 어떤 정보나 문서를 준비하면 좋아?",
    ],
    showExtras: true,
    isStreaming: false,
    chatId: null,
    usage: null,
  },
];

const normalizeRole = (role) => {
  if (!role) return "ai";
  const r = String(role).toLowerCase();
  if (r === "user") return "user";
  if (r === "assistant" || r === "ai") return "ai";
  return "ai";
};

const normalizeUsage = (u) => {
  if (!u) return null;
  const model = u.model ?? u.MODEL ?? null;
  const tokensIn = u.tokensIn ?? u.tokens_in ?? null;
  const tokensOut = u.tokensOut ?? u.tokens_out ?? null;
  const tokensTotal = u.tokensTotal ?? u.tokens_total ?? (tokensIn != null && tokensOut != null ? (tokensIn + tokensOut) : null);
  const latencyMs = u.latencyMs ?? u.latency_ms ?? null;

  if (model == null && tokensIn == null && tokensOut == null && tokensTotal == null && latencyMs == null) return null;

  return { model, tokensIn, tokensOut, tokensTotal, latencyMs };
};

const normalizeMessages = (serverMessages) => {
  if (!Array.isArray(serverMessages)) return [];
  return serverMessages.map((m) => ({
    role: normalizeRole(m.role),
    content: m.content ?? "",
    references: m.references ?? [],
    followUpQuestions: Array.isArray(m.followUpQuestions) ? m.followUpQuestions : [],
    chatId: m.chatId ?? m.id ?? m.chat_id ?? null,
    likeCount: m.likeCount ?? 0,
    dislikeCount: m.dislikeCount ?? 0,
    myFeedback: m.myFeedback ?? null,
    usage: normalizeUsage(m.usage) ?? null, // ✅ 추가
    isStreaming: false,
    showExtras: true,
  }));
};

// grouped DTO -> flat sessions (최근 목록용)
const flattenGroupedSessions = (data) => {
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const g of data) {
    const sessions = Array.isArray(g.sessions)
      ? g.sessions
      : Array.isArray(g.items)
        ? g.items
        : [];
    for (const s of sessions) out.push(s);
  }
  return out;
};

export default function MiniChatbot({ isLoggedIn }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const [recentSessions, setRecentSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 디버그(토큰/지연) 토글
  const [showDebug, setShowDebug] = useState(false);

  const bottomRef = useRef(null);

  // ✅ SSE stream ref
  const streamRef = useRef(null);

  // ✅ 타이핑 큐
  const typingQueueRef = useRef("");
  const typingRunningRef = useRef(false);

  // ✅ done이 먼저 와도 "타이핑이 끝난 뒤" extras를 열기 위한 플래그
  const pendingFinalizeRef = useRef(null); // { aiTempId: string } | null

  const makeTempId = () => {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const closeStream = () => {
    if (streamRef.current) {
      try {
        streamRef.current.close();
      } catch (err) {
        console.warn("SSE close failed (ignored):", err);
      }
      streamRef.current = null;
    }
    typingQueueRef.current = "";
    typingRunningRef.current = false;
    pendingFinalizeRef.current = null;
  };

  useEffect(() => {
    if (!isChatOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isChatOpen]);

  useEffect(() => {
    return () => closeStream();
  }, []);

  // -----------------------------
  // API helpers
  // -----------------------------
  const loadRecentSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await axiosInstance.get("/api/chat/sessions/grouped");
      const flat = flattenGroupedSessions(res.data);
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
    const sres = await axiosInstance.post("/api/chat/sessions/latest");
    const sid = sres.data.sessionId;
    setSessionId(sid);
    return sid;
  };

  // ✅ 세션 제목을 recentSessions에 즉시 반영(새로고침 없이 드롭다운 갱신)
  const applySessionTitle = (sid, newTitle) => {
    if (!sid || !newTitle) return;

    const title = String(newTitle).trim();
    if (!title) return;

    setRecentSessions((prev) => {
      const next = prev.map((s) => {
        const id = s.sessionId ?? s.id;
        return String(id) === String(sid) ? { ...s, title } : s;
      });

      const exists = next.some((s) => String(s.sessionId ?? s.id) === String(sid));
      if (!exists) return [{ sessionId: sid, title }, ...next].slice(0, 15);

      return next;
    });
  };

  const createNewSession = async () => {
    try {
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
            closeStream();
            setSessionId(sid);
            setMessages(DEFAULT_MESSAGES);
            await loadRecentSessions();
            return sid;
          }
        } catch (err) {
          console.warn(`[세션 생성 실패] ${c.method.toUpperCase()} ${c.url}`, err);
        }
      }

      closeStream();
      setSessionId(null);
      setMessages(DEFAULT_MESSAGES);
      alert(
        "⚠️ 서버에 '새 세션 생성 API'가 없어 화면만 새 대화로 초기화했습니다.\n(백엔드에 세션 생성 엔드포인트 추가 시 완전 지원 가능)"
      );
      return null;
    } catch (e) {
      console.error("새 세션 생성 실패:", e);
      alert("새 대화 시작에 실패했습니다. (서버 로그 확인)");
      return null;
    }
  };

  const deleteCurrentSession = async () => {
    if (!sessionId) {
      setMessages(DEFAULT_MESSAGES);
      return;
    }

    const ok = window.confirm(`현재 대화(세션 #${sessionId})를 삭제할까요?`);
    if (!ok) return;

    try {
      closeStream();
      await axiosInstance.delete(`/api/chat/sessions/${sessionId}`);

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
      if (navigator?.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        alert("복사되었습니다!");
        return;
      }

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

    setMessages((prev) =>
      prev.map((m) => (m.chatId === chatId ? { ...m, likeCount, dislikeCount, myFeedback } : m))
    );
  };

  // -----------------------------
  // 스트리밍(타이핑) 유틸
  // -----------------------------
  const finalizeIfReady = (aiTempId) => {
    if (typingQueueRef.current.length > 0 || typingRunningRef.current) return;

    setMessages((prev) =>
      prev.map((m) =>
        m._tempId === aiTempId ? { ...m, isStreaming: false, showExtras: true } : m
      )
    );

    pendingFinalizeRef.current = null;
    setLoading(false);
  };

  const pumpTyping = async (aiTempId) => {
    if (typingRunningRef.current) return;
    typingRunningRef.current = true;

    try {
      while (typingQueueRef.current.length > 0) {
        const ch = typingQueueRef.current[0];
        typingQueueRef.current = typingQueueRef.current.slice(1);

        setMessages((prev) =>
          prev.map((m) => (m._tempId === aiTempId ? { ...m, content: (m.content ?? "") + ch } : m))
        );

        await new Promise((r) => setTimeout(r, 12));
      }
    } finally {
      typingRunningRef.current = false;

      if (pendingFinalizeRef.current?.aiTempId === aiTempId) {
        finalizeIfReady(aiTempId);
      }
    }
  };

  // -----------------------------
  // regenerate (기존 /api/rag/ask 유지)
  // -----------------------------
  const regenerate = async () => {
    if (loading) return;

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/rag/ask", {
        sessionId,
        question: lastUser.content,
        regenerate: true,
      });

      applySessionTitle(sessionId, res.data.sessionTitle);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: res.data.answer ?? "(답변이 비어있습니다)",
          chatId: res.data.assistantChatId,
          likeCount: 0,
          dislikeCount: 0,
          myFeedback: null,
          references: res.data.references ?? [],
          followUpQuestions: res.data.followUpQuestions ?? [],
          usage: normalizeUsage(res.data.usage) ?? null, // ✅ 추가
          isStreaming: false,
          showExtras: true,
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
        {
          role: "ai",
          content: "⚠️ 이전 대화를 불러오지 못했습니다. 새로 대화를 시작할 수 있어요.",
          showExtras: true,
          isStreaming: false,
        },
      ]);
    }
  };

  const toggleChat = async () => {
    if (!isLoggedIn) {
      alert("AI 비서 기능은 로그인이 필요합니다.");
      return;
    }

    if (isChatOpen) {
      closeStream();
      setLoading(false);
      setIsChatOpen(false);
      return;
    }

    setIsChatOpen(true);
    await openChatAndLoad();
  };

  // ✅ Home 'open-mini-chat' 이벤트
  useEffect(() => {
    const handler = async (e) => {
      if (!isLoggedIn) {
        alert("AI 비서 기능은 로그인이 필요합니다.");
        return;
      }

      const detail = e?.detail || {};
      setIsChatOpen(true);

      await openChatAndLoad();

      if (detail.question) {
        if (detail.autoSend) {
          await submitQuestion(detail.question);
        } else {
          setInput(detail.question);
        }
      }
    };

    window.addEventListener("open-mini-chat", handler);
    return () => window.removeEventListener("open-mini-chat", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // -----------------------------
  // chat (SSE)
  // -----------------------------
  const submitQuestion = async (text, { appendUser = true } = {}) => {
    const q = String(text ?? "").trim();
    if (!q || loading) return;

    let sid = sessionId;
    if (!sid) {
      const sres = await axiosInstance.post("/api/chat/sessions/latest");
      sid = sres.data.sessionId;
      setSessionId(sid);
    }

    closeStream();

    if (appendUser) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: q, showExtras: false, isStreaming: false },
      ]);
    }

    const aiTempId = makeTempId();

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        content: "",
        references: [],
        followUpQuestions: [],
        chatId: null,
        likeCount: 0,
        dislikeCount: 0,
        myFeedback: null,
        usage: null, // ✅ 자리
        _tempId: aiTempId,
        isStreaming: true,
        showExtras: false,
      },
    ]);

    setLoading(true);

    try {
      const startRes = await axiosInstance.post("/api/rag/ask/start", {
        sessionId: sid,
        question: q,
      });
      const jobId = startRes.data.jobId;

      const es = new EventSource(
        `${getSseBaseUrl()}/api/rag/ask/stream?jobId=${encodeURIComponent(jobId)}`,
        { withCredentials: true }
      );
      streamRef.current = es;

      es.onmessage = (e) => {
        typingQueueRef.current += e.data ?? "";
        pumpTyping(aiTempId);
      };

      // ✅ meta: references / followUp / chatId / (optional) usage
      es.addEventListener("meta", (e) => {
        let meta = null;
        try {
          meta = JSON.parse(e.data);
        } catch {
          meta = null;
        }
        if (!meta) return;

        applySessionTitle(sid, meta.sessionTitle);

        setMessages((prev) =>
          prev.map((m) => {
            if (m._tempId !== aiTempId) return m;
            return {
              ...m,
              references: meta.references ?? m.references ?? [],
              followUpQuestions: meta.followUpQuestions ?? m.followUpQuestions ?? [],
              chatId: meta.assistantChatId ?? meta.chatId ?? m.chatId ?? null,
              usage: normalizeUsage(meta.usage) ?? m.usage ?? null, // ✅ 추가
            };
          })
        );
      });

      es.addEventListener("done", () => {
        es.close();
        if (streamRef.current === es) streamRef.current = null;

        pendingFinalizeRef.current = { aiTempId };
        finalizeIfReady(aiTempId);
      });

      es.addEventListener("error", () => {
        es.close();
        if (streamRef.current === es) streamRef.current = null;

        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === aiTempId
              ? {
                ...m,
                isStreaming: false,
                showExtras: true,
                content: (m.content ?? "") + "\n\n⚠️ 스트리밍 중 오류",
              }
              : m
          )
        );
        setLoading(false);
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "⚠️ 답변 생성 중 오류가 발생했습니다.",
          showExtras: true,
          isStreaming: false,
        },
      ]);
      setLoading(false);
    }
  };

  const isThinking = messages.some(
    (m) => m.role === "ai" && m.isStreaming && (!m.content || m.content.length === 0)
  );

  const askAi = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    await submitQuestion(q);
  };

  const changeSession = async (sid) => {
    if (!sid) return;
    try {
      closeStream();
      setLoading(false);

      setSessionId(sid);
      setMessages([{ role: "ai", content: "불러오는 중...", showExtras: false, isStreaming: false }]);
      await loadMessagesBySession(sid);
    } catch (e) {
      console.error("세션 전환 실패:", e);
      setMessages([{ role: "ai", content: "⚠️ 대화를 불러오지 못했습니다.", showExtras: true, isStreaming: false }]);
    }
  };

  const renderUsageLine = (u) => {
    const usage = normalizeUsage(u);
    if (!usage) return null;

    const model = usage.model ?? "-";
    const total = usage.tokensTotal ?? "-";
    const inOut =
      usage.tokensIn != null && usage.tokensOut != null
        ? ` (in ${usage.tokensIn} / out ${usage.tokensOut})`
        : "";
    const lat = usage.latencyMs != null ? `${usage.latencyMs}ms` : "-";

    return (
      <div className="text-muted small" style={{ marginTop: 4 }}>
        모델: <span className="font-monospace">{model}</span>
        {" · "}
        토큰: <span className="font-monospace">{total}</span>
        {inOut}
        {" · "}
        지연: <span className="font-monospace">{lat}</span>
      </div>
    );
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

      {/* Mini Chat Window */}
      {isChatOpen && (
        <div
          className="card shadow-2xl border-0 animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{
            position: "fixed",
            bottom: "100px",
            right: "24px",
            width: "min(420px, 92vw)",
            height: "min(760px, 78vh)",
            zIndex: 1050,
            borderRadius: "24px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* header */}
          <div className="p-3 text-white" style={{ backgroundColor: "#059669" }}>
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                <MessageSquareText size={20} className="me-2" />
                <span
                  className="fw-bold"
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "220px",
                  }}
                  title="홈스캐너 AI 비서"
                >
                  홈스캐너 AI 비서
                </span>
              </div>

              <div className="d-flex align-items-center gap-2">
                {/* ✅ DBG 토글 */}
                <button
                  className={`btn btn-sm ${showDebug ? "btn-dark" : "btn-light"}`}
                  style={{ borderRadius: 12 }}
                  onClick={() => setShowDebug((v) => !v)}
                  title="디버그(토큰/지연) 표시"
                >
                  <Bug size={16} />
                </button>

                <button
                  onClick={() => {
                    closeStream();
                    setLoading(false);
                    setIsChatOpen(false);
                  }}
                  className="btn btn-link text-white p-0"
                  title="닫기"
                  style={{ flex: "0 0 auto" }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 mt-2">
              <select
                className="form-select form-select-sm"
                style={{ flex: 1, borderRadius: 12, minWidth: 0 }}
                value={sessionId ?? ""}
                onChange={(e) => changeSession(Number(e.target.value))}
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

              <button
                className="btn btn-sm btn-light"
                style={{ borderRadius: 12, flex: "0 0 auto" }}
                onClick={createNewSession}
                title="새 대화"
                disabled={loading}
              >
                <Plus size={16} />
              </button>

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

              // 빈 스트리밍 AI 말풍선 숨기기
              if (isAi && msg.isStreaming && (!msg.content || msg.content.length === 0)) {
                return null;
              }

              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    className="p-3 rounded-4 mb-1 shadow-sm"
                    style={{
                      maxWidth: "85%",
                      backgroundColor: isUser ? "#059669" : "#ffffff",
                      color: isUser ? "white" : "black",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* ✅ AI 답변 액션: 스트리밍 끝난 뒤에만 */}
                  {isAi && msg.showExtras && !msg.isStreaming && msg.chatId && (
                    <div style={{ maxWidth: "85%" }}>
                      <div className="msg-actions">
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

                      {/* ✅ 디버그(토큰/지연) 표시: DBG 토글 ON일 때만 */}
                      {showDebug && renderUsageLine(msg.usage)}
                    </div>
                  )}

                  {/* ✅ 추천 질문: 스트리밍 끝난 뒤에만 */}
                  {isAi &&
                    msg.showExtras &&
                    !msg.isStreaming &&
                    Array.isArray(msg.followUpQuestions) &&
                    msg.followUpQuestions.length > 0 && (
                      <div className="fu-wrap">
                        <div className="fu-label">
                          <span className="fu-badge">추천 질문</span>
                        </div>

                        {msg.followUpQuestions.slice(0, 3).map((q, i) => (
                          <button
                            key={i}
                            type="button"
                            className="fu-chip"
                            onClick={() => submitQuestion(q)}
                            disabled={loading}
                            title="추천 질문으로 이어서 묻기"
                          >
                            <span className="fu-dot" />
                            <span className="fu-text">{q}</span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}

            {/* ✅ “생각 중”은 ‘스트리밍 중 + 아직 글자 0개’일 때만 */}
            {isThinking && (
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
