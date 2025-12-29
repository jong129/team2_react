import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Trash2, MessageSquareText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

const AiBotPage = () => {
  const navigate = useNavigate();

  // -----------------------------
  // state
  // -----------------------------
  const [groupedSessions, setGroupedSessions] = useState([]); // [{ date: "YYYY-MM-DD", sessions: [...] }]
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [messages, setMessages] = useState([]); // [{ role, content, createdAt, chatId }]
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // 검색
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchGroups, setSearchGroups] = useState([]); // [{ date: "YYYY-MM-DD", results:[{sessionId, chatId, role, content, createdAt}] }]
  const [highlightChatId, setHighlightChatId] = useState(null);

  // 스크롤/하이라이트 이동용
  const chatAreaRef = useRef(null);
  const messageRefs = useRef(new Map()); // chatId -> element

  // -----------------------------
  // utils
  // -----------------------------
  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const normalizeGroupedSessions = (data) => {
    // 서버 DTO 예상: [{ date, sessions:[{sessionId,title,startTime,lastMessageAt}] }]
    if (!Array.isArray(data)) return [];
    return data.map((g) => ({
      date: g.date ?? g.key ?? g.groupKey ?? "",
      sessions: Array.isArray(g.sessions) ? g.sessions : (Array.isArray(g.items) ? g.items : []),
    }));
  };

  const normalizeMessages = (data) => {
    // 서버 DTO: { sessionId, messages:[{chatId, role, content, createdAt}] }
    const arr = data?.messages;
    if (!Array.isArray(arr)) return [];
    return arr.map((m, idx) => ({
      chatId: m.chatId ?? m.id ?? idx,
      role: (m.role || "ai").toLowerCase() === "assistant" ? "ai" : (m.role || "ai"),
      content: m.content ?? "",
      createdAt: m.createdAt,
    }));
  };

  const normalizeSearchGroups = (data) => {
    // 서버 DTO: [{ date, results:[...SearchResultDto] }]
    // ChatHistoryService에서 new GroupedSearchResultsDto(dateKey, list) 형태로 반환
    if (!Array.isArray(data)) return [];
    return data.map((g) => ({
      date: g.date ?? g.key ?? g.groupKey ?? "",
      results: Array.isArray(g.results) ? g.results : (Array.isArray(g.items) ? g.items : []),
    }));
  };

  // -----------------------------
  // api
  // -----------------------------
  const loadGroupedSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await axiosInstance.get("/api/chat/sessions/grouped");
      const normalized = normalizeGroupedSessions(res.data);

      setGroupedSessions(normalized);

      // 첫 세션 자동 선택 (검색 중이면 선택 안 함)
      if (!searching) {
        const first = normalized?.[0]?.sessions?.[0];
        if (first?.sessionId && activeSessionId == null) {
          setActiveSessionId(first.sessionId);
        }
      }
    } catch (e) {
      console.error("세션 목록 로드 실패:", e);
      setGroupedSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMessages = async (sessionId, { highlightId } = {}) => {
    if (!sessionId) return;
    setLoadingMessages(true);
    setHighlightChatId(highlightId ?? null);

    try {
      const res = await axiosInstance.get(`/api/chat/sessions/${sessionId}/messages`, {
        params: { limit: 500 },
      });

      const normalized = normalizeMessages(res.data);
      setMessages(normalized);

      // 렌더 후 하이라이트 메시지로 스크롤
      setTimeout(() => {
        if (!highlightId) {
          // 그냥 맨 아래로
          chatAreaRef.current?.scrollTo({ top: chatAreaRef.current.scrollHeight, behavior: "smooth" });
          return;
        }
        const el = messageRefs.current.get(highlightId);
        if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } catch (e) {
      console.error("메시지 로드 실패:", e);
      setMessages([{ chatId: "err", role: "ai", content: "⚠️ 대화 내용을 불러오지 못했습니다.", createdAt: null }]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!sessionId) return;
    const ok = window.confirm("이 대화를 삭제할까요? (목록에서 숨김 처리됩니다)");
    if (!ok) return;

    try {
      await axiosInstance.delete(`/api/chat/sessions/${sessionId}`);
      // 삭제 후 목록 갱신
      await loadGroupedSessions();

      // 현재 열어둔 세션 삭제면 우측도 정리
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("세션 삭제 실패:", e);
      alert("삭제에 실패했습니다. (권한/서버 로그 확인)");
    }
  };

  const runSearch = async (kw) => {
    const k = (kw ?? "").trim();
    if (!k) {
      setSearching(false);
      setSearchGroups([]);
      setHighlightChatId(null);
      return;
    }

    setSearching(true);
    try {
      const res = await axiosInstance.get("/api/chat/messages/search", {
        params: { keyword: k, size: 200 },
      });
      setSearchGroups(normalizeSearchGroups(res.data));
    } catch (e) {
      console.error("검색 실패:", e);
      setSearchGroups([]);
    }
  };

  // -----------------------------
  // effects
  // -----------------------------
  useEffect(() => {
    loadGroupedSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // activeSessionId 바뀌면 메시지 로드 (검색모드일 때도 동일)
  useEffect(() => {
    if (!activeSessionId) return;
    loadMessages(activeSessionId, { highlightId: highlightChatId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // -----------------------------
  // derived
  // -----------------------------
  const leftGroups = useMemo(() => {
    // 검색 중이면 검색 결과 그룹, 아니면 세션 그룹
    if (searching) return searchGroups;
    return groupedSessions;
  }, [searching, searchGroups, groupedSessions]);

  // -----------------------------
  // ui
  // -----------------------------
  const TopBar = () => (
    <div className="bg-white border-bottom" style={{ position: "sticky", top: 0, zIndex: 50 }}>
      <div className="container" style={{ maxWidth: 1200 }}>
        <div className="d-flex align-items-center justify-content-between py-3">
          <button className="btn btn-link text-decoration-none" onClick={() => navigate(-1)}>
            <ArrowLeft className="me-2" />
            뒤로
          </button>

          <div className="fw-bold d-flex align-items-center" style={{ color: "#059669" }}>
            <MessageSquareText className="me-2" />
            AI 대화 이력
          </div>

          <div style={{ width: 64 }} />
        </div>
      </div>
    </div>
  );

  const SearchBar = () => (
    <div className="p-3 border-bottom bg-white">
      <div className="d-flex gap-2 align-items-center">
        <div className="input-group">
          <span className="input-group-text bg-light border-0">
            <Search size={18} />
          </span>
          <input
            className="form-control bg-light border-0"
            placeholder="키워드로 대화 검색 (예: 전세, 근저당, 특약...)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch(keyword);
            }}
          />
        </div>

        <button
          className="btn text-white"
          style={{ background: "#059669", borderRadius: 12, minWidth: 86 }}
          onClick={() => runSearch(keyword)}
        >
          검색
        </button>

        {(searching || keyword.trim()) && (
          <button
            className="btn btn-outline-secondary"
            style={{ borderRadius: 12 }}
            onClick={() => {
              setKeyword("");
              setSearching(false);
              setSearchGroups([]);
              setHighlightChatId(null);
            }}
            title="검색 초기화"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {searching && (
        <div className="small text-muted mt-2">
          검색 결과는 <b>날짜별</b>로 묶여 표시됩니다. 항목을 클릭하면 해당 세션으로 이동합니다.
        </div>
      )}
    </div>
  );

  const Bubble = ({ m }) => {
    const isUser = (m.role || "").toLowerCase() === "user";
    const isHighlight = highlightChatId != null && String(m.chatId) === String(highlightChatId);

    return (
      <div
        ref={(el) => {
          if (el) messageRefs.current.set(m.chatId, el);
        }}
        className="mb-3 d-flex"
        style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}
      >
        <div
          className="shadow-sm"
          style={{
            maxWidth: "82%",
            padding: "12px 14px",
            borderRadius: 18,
            background: isUser ? "#059669" : "white",
            color: isUser ? "white" : "#0f172a",
            whiteSpace: "pre-wrap",
            lineHeight: 1.45,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            border: isUser ? "none" : "1px solid #eef2f7",
            boxShadow: isHighlight ? "0 0 0 3px rgba(5,150,105,0.25)" : undefined,
          }}
        >
          {m.content}
          {m.createdAt && (
            <div className="mt-2" style={{ fontSize: 11, opacity: 0.75 }}>
              {fmtDate(m.createdAt)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const LeftPanel = () => (
    <div className="bg-white border rounded-4 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 164px)" }}>
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="fw-bold" style={{ color: "#059669" }}>
          {searching ? "검색 결과" : "대화 목록"}
        </div>
        <div className="small text-muted">{loadingSessions ? "불러오는 중..." : ""}</div>
      </div>

      <div style={{ overflowY: "auto", height: "100%" }}>
        {leftGroups.length === 0 && (
          <div className="p-4 text-center text-muted">
            {searching ? "검색 결과가 없습니다." : "대화 내역이 없습니다."}
          </div>
        )}

        {leftGroups.map((g, gi) => (
          <div key={gi} className="border-bottom">
            <div className="px-3 py-2 fw-semibold" style={{ background: "#f8fafc" }}>
              {g.date}
            </div>

            {/* 검색 모드: results / 일반: sessions */}
            {(searching ? g.results : g.sessions).map((item, idx) => {
              if (searching) {
                const r = item;
                return (
                  <div
                    key={`${r.chatId}-${idx}`}
                    className="px-3 py-2 border-top"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setHighlightChatId(r.chatId);
                      setActiveSessionId(r.sessionId);
                      // loadMessages는 effect에서 수행됨
                    }}
                  >
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-semibold" style={{ fontSize: 13 }}>
                          세션 #{r.sessionId} · {String(r.role || "").toUpperCase()}
                        </div>
                        <div className="text-muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.content}
                        </div>
                        {r.createdAt && (
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {fmtDate(r.createdAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // 일반 모드: sessions
              const s = item;
              const sid = s.sessionId ?? s.id;
              const active = String(sid) === String(activeSessionId);

              return (
                <div
                  key={sid ?? idx}
                  className="px-3 py-2 border-top"
                  style={{
                    cursor: "pointer",
                    background: active ? "#ecfdf5" : "white",
                  }}
                  onClick={() => {
                    setHighlightChatId(null);
                    setActiveSessionId(sid);
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-semibold" style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.title || "대화"}
                      </div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {s.lastMessageAt ? fmtDate(s.lastMessageAt) : (s.startTime ? fmtDate(s.startTime) : "")}
                      </div>
                    </div>

                    <button
                      className="btn btn-sm btn-link text-danger"
                      title="삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(sid);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const RightPanel = () => (
    <div className="bg-white border rounded-4 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 164px)", minWidth: 0 }}>
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
        <div>
          <div className="fw-bold" style={{ color: "#059669" }}>
            대화 내용
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            {activeSessionId ? `세션 #${activeSessionId}` : "왼쪽에서 대화를 선택하세요"}
          </div>
        </div>
        <div className="small text-muted">{loadingMessages ? "불러오는 중..." : ""}</div>
      </div>

      <div
        ref={chatAreaRef}
        className="p-3"
        style={{
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          background: "#f8fafc",
        }}
      >
        {!activeSessionId && (
          <div className="p-4 text-center text-muted">
            대화를 선택하면 여기에서 전체 기록을 볼 수 있어요.
          </div>
        )}

        {activeSessionId && messages.length === 0 && !loadingMessages && (
          <div className="p-4 text-center text-muted">이 세션에는 대화가 없습니다.</div>
        )}

        {messages.map((m) => (
          <Bubble key={m.chatId} m={m} />
        ))}

        {loadingMessages && (
          <div className="text-center text-muted py-3">불러오는 중...</div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <TopBar />

      <div className="container py-4" style={{ maxWidth: 1200 }}>
        <div className="row g-3" style={{ marginLeft: 0, marginRight: 0 }}>
          <div className="col-12 col-lg-4">
            <SearchBar />
            <LeftPanel />
          </div>

          <div className="col-12 col-lg-8">
            <RightPanel />
          </div>
        </div>

        <div className="mt-3 text-end">
          <button className="btn btn-outline-secondary" onClick={() => loadGroupedSessions()}>
            목록 새로고침
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiBotPage;
