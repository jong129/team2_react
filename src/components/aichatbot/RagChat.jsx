import React, { useEffect, useRef, useState } from "react";
import RagReferences from "./RagReferences";
import { ArrowRight, X, MessageSquareText } from "lucide-react";

const RagChat = ({ isOpen, onClose, sessionId = 1 }) => {
  const [messages, setMessages] = useState([
    { role: "ai", content: "안녕하세요! 무엇을 도와드릴까요?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen]);

  const askAi = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");

    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res = await fetch("/api/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question })
      });

      // ✅ HTTP 에러 처리(404/500 등)
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} / ${text}`);
      }

      const data = await res.json();
      // data: { answer, references: [...] }

      setMessages(prev => [
        ...prev,
        {
          role: "ai",
          content: data.answer ?? "(답변이 비어있습니다)",
          references: data.references ?? []
        }
      ]);
    } catch (e) {
      console.error("AI 요청 실패:", e);
      setMessages(prev => [
        ...prev,
        { role: "ai", content: "⚠️ 답변 생성 중 오류가 발생했습니다." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="card shadow-2xl border-0 animate-in"
      style={{
        position: "fixed",
        bottom: "100px",
        right: "24px",
        width: "380px",
        height: "560px",
        zIndex: 1050,
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      {/* header */}
      <div className="p-3 text-white d-flex align-items-center justify-content-between"
        style={{ backgroundColor: "#059669" }}>
        <div className="d-flex align-items-center">
          <MessageSquareText size={20} className="me-2" />
          <span className="fw-bold">홈스캐너 RAG 챗봇</span>
        </div>
        <button onClick={onClose} className="btn btn-link text-white p-0">
          <X size={20} />
        </button>
      </div>

      {/* body */}
      <div className="flex-grow-1 p-3 bg-light overflow-auto" style={{ fontSize: "0.9rem" }}>
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
              <div
                className="p-3 rounded-4 mb-2 shadow-sm"
                style={{
                  maxWidth: "90%",
                  backgroundColor: isUser ? "#059669" : "#ffffff",
                  color: isUser ? "white" : "black",
                  whiteSpace: "pre-wrap"
                }}
              >
                {msg.content}
              </div>

              {/* ✅ AI 답변이면 references 표시 */}
              {!isUser && msg.references?.length > 0 && (
                <div style={{ maxWidth: "90%" }}>
                  <RagReferences refs={msg.references} />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="p-3 rounded-4 bg-white shadow-sm" style={{ maxWidth: "90%" }}>
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
            onKeyDown={(e) => e.key === "Enter" && askAi()}
            disabled={loading}
          />
          <button className="btn btn-emerald" onClick={askAi} disabled={loading}>
            <ArrowRight size={18} color="white" />
          </button>
        </div>
      </div>

      <style>{`
        .btn-emerald { background-color: #059669; border: none; }
        .btn-emerald:hover { background-color: #047857; }
        .animate-in { animation: slideUp 0.25s ease-out forwards; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RagChat;
