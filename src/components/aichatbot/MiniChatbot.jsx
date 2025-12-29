// src/components/aichatbot/MiniChatbot.jsx
import React, { useEffect, useRef, useState } from "react";
import { MessageSquareText, X, ArrowRight, MessageCircle } from "lucide-react";
import { axiosInstance } from "../Tool"; // 경로 주의! (너 프로젝트에 맞게)

const DEFAULT_MESSAGES = [
  { role: "ai", content: "안녕하세요! 무엇을 도와드릴까요?" },
  { role: "ai", content: "문서분석/체크리스트 결과를 기반으로 이어서 질문해도 돼요." },
];

const normalizeRole = (role) => {
  if (!role) return "ai";
  const r = role.toLowerCase();
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
  }));
};

export default function MiniChatbot({ isLoggedIn }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isChatOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isChatOpen]);

  const openChatAndLoad = async () => {
    try {
      // 1) 최근 세션 id 가져오기(없으면 생성)
      const sres = await axiosInstance.post("/api/chat/sessions/latest");
      const sid = sres.data.sessionId;
      setSessionId(sid);

      // 2) 메시지 로드
      const mres = await axiosInstance.get(
        `/api/chat/sessions/${sid}/messages`,
        { params: { limit: 50 } }
      );

      const loaded = normalizeMessages(mres.data.messages);

      setMessages(loaded.length > 0 ? loaded : DEFAULT_MESSAGES);
    } catch (err) {
      console.error("세션/기록 로드 실패:", err);
      setMessages([
        { role: "ai", content: "⚠️ 이전 대화를 불러오지 못했습니다. 새로 대화를 시작할 수 있어요." },
      ]);
    }
  };

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

  const askAi = async () => {
    if (!input.trim() || loading) return;
    if (!sessionId) {
      alert("대화 준비 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const question = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await axiosInstance.post("/api/rag/ask", {
        sessionId,
        question,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: res.data.answer ?? "(답변이 비어있습니다)",
          references: res.data.references ?? [],
        },
      ]);
    } catch (err) {
      console.error("AI 요청 실패:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠️ 답변 생성 중 오류가 발생했습니다." },
      ]);
    } finally {
      setLoading(false);
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
            width: "350px",
            height: "500px",
            zIndex: 1050,
            borderRadius: "24px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div className="p-3 text-white d-flex align-items-center justify-content-between" style={{ backgroundColor: "#059669" }}>
            <div className="d-flex align-items-center">
              <MessageSquareText size={20} className="me-2" />
              <span className="fw-bold">홈스캐너 AI 비서</span>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="btn btn-link text-white p-0">
              <X size={20} />
            </button>
          </div>

          <div className="flex-grow-1 p-3 bg-light overflow-auto" style={{ fontSize: "0.9rem" }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className="p-3 rounded-4 mb-2 shadow-sm"
                style={{
                  maxWidth: "85%",
                  marginLeft: msg.role === "user" ? "auto" : 0,
                  backgroundColor: msg.role === "user" ? "#059669" : "#ffffff",
                  color: msg.role === "user" ? "white" : "black",
                }}
              >
                {msg.content}
              </div>
            ))}

            {loading && (
              <div className="p-3 rounded-4 bg-white shadow-sm">
                AI가 답변을 생성 중입니다...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

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
