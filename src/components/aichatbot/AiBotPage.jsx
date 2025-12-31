import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Trash2, MessageSquareText, X, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

// -----------------------------
// utils
// -----------------------------
const safeLower = (v) => String(v ?? "").toLowerCase();

const fmtDateTime = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "";
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
  return arr.map((m, idx) => {
    const roleRaw = safeLower(m.role || "ai");
    const role = roleRaw === "assistant" ? "ai" : (roleRaw === "user" ? "user" : "ai");
    return {
      chatId: m.chatId ?? m.id ?? idx,
      role,
      content: m.content ?? "",
      createdAt: m.createdAt ?? null,
    };
  });
};

const normalizeSearchGroups = (data) => {
  // 서버 DTO: [{ date, results:[{sessionId, chatId, role, content, createdAt}] }]
  if (!Array.isArray(data)) return [];
  return data.map((g) => ({
    date: g.date ?? g.key ?? g.groupKey ?? "",
    results: Array.isArray(g.results) ? g.results : (Array.isArray(g.items) ? g.items : []),
  }));
};

// debounce 훅
const useDebouncedValue = (value, delayMs = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
};

// TopBar 높이 자동 측정 훅 (ResizeObserver)
const useElementHeight = (ref) => {
  const [h, setH] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setH(el.getBoundingClientRect().height || 0);
    update();

    // ResizeObserver 지원
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
      // fallback
      window.addEventListener("resize", update);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, [ref]);

  return h;
};

// -----------------------------
// component
// -----------------------------
export default function AiBotPage() {
  const navigate = useNavigate();

  // ---- TopBar height
  const topBarRef = useRef(null);
  const topBarH = useElementHeight(topBarRef);

  // ---- state
  const [groupedSessions, setGroupedSessions] = useState([]); // [{date, sessions:[]}]
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [messages, setMessages] = useState([]); // [{chatId, role, content, createdAt}]
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const [searching, setSearching] = useState(false);
  const [searchGroups, setSearchGroups] = useState([]); // [{date, results:[]}]
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [highlightChatId, setHighlightChatId] = useState(null);
  const [errorBanner, setErrorBanner] = useState("");

  // ---- refs
  const chatAreaRef = useRef(null);
  const messageRefs = useRef(new Map()); // chatId -> element

  // -----------------------------
  // api
  // -----------------------------
  const loadGroupedSessions = async ({ autoPickFirst = true } = {}) => {
    setLoadingSessions(true);
    setErrorBanner("");
    try {
      const res = await axiosInstance.get("/api/chat/sessions/grouped");
      const normalized = normalizeGroupedSessions(res.data);
      setGroupedSessions(normalized);

      if (autoPickFirst && !searching) {
        const first = normalized?.[0]?.sessions?.[0];
        if (first?.sessionId && activeSessionId == null) {
          setActiveSessionId(first.sessionId);
        }
      }
    } catch (e) {
      console.error("세션 목록 로드 실패:", e);
      setGroupedSessions([]);
      setErrorBanner("⚠️ 대화 목록을 불러오지 못했습니다. (서버/로그인 상태 확인)");
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMessages = async (sessionId, { highlightId } = {}) => {
    if (!sessionId) return;
    setLoadingMessages(true);
    setErrorBanner("");

    try {
      const res = await axiosInstance.get(`/api/chat/sessions/${sessionId}/messages`, {
        params: { limit: 500 },
      });
      const normalized = normalizeMessages(res.data);
      setMessages(normalized);
      setHighlightChatId(highlightId ?? null);
    } catch (e) {
      console.error("메시지 로드 실패:", e);
      setMessages([{ chatId: "err", role: "ai", content: "⚠️ 대화 내용을 불러오지 못했습니다.", createdAt: null }]);
      setErrorBanner("⚠️ 대화 내용을 불러오지 못했습니다.");
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
      await loadGroupedSessions({ autoPickFirst: false });

      if (String(activeSessionId) === String(sessionId)) {
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
    setLoadingSearch(true);
    setErrorBanner("");

    try {
      const res = await axiosInstance.get("/api/chat/messages/search", {
        params: { keyword: k, size: 200 },
      });
      setSearchGroups(normalizeSearchGroups(res.data));
    } catch (e) {
      console.error("검색 실패:", e);
      setSearchGroups([]);
      setErrorBanner("⚠️ 검색에 실패했습니다.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const clearSearch = () => {
    setKeyword("");
    setSearching(false);
    setSearchGroups([]);
    setHighlightChatId(null);
  };

  // -----------------------------
  // effects
  // -----------------------------
  useEffect(() => {
    loadGroupedSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 세션 선택되면 메시지 로드
  useEffect(() => {
    if (!activeSessionId) return;
    loadMessages(activeSessionId, { highlightId: highlightChatId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // 검색: 입력 멈추면 자동 검색(빈값이면 검색 해제)
  useEffect(() => {
    const k = (debouncedKeyword ?? "").trim();
    if (!k) {
      if (searching) clearSearch();
      return;
    }
    runSearch(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword]);

  // 메시지 렌더 직후 스크롤 처리(하이라이트 우선, 없으면 맨 아래)
  useLayoutEffect(() => {
    if (!activeSessionId) return;
    if (!chatAreaRef.current) return;
    if (loadingMessages) return;

    if (highlightChatId != null) {
      const el = messageRefs.current.get(highlightChatId);
      if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    chatAreaRef.current.scrollTo({
      top: chatAreaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeSessionId, loadingMessages, messages, highlightChatId]);

  // -----------------------------
  // derived
  // -----------------------------
  const leftGroups = useMemo(() => (searching ? searchGroups : groupedSessions), [searching, searchGroups, groupedSessions]);

  const totalSearchHits = useMemo(() => {
    if (!searching) return 0;
    return (searchGroups || []).reduce((acc, g) => acc + (g.results?.length || 0), 0);
  }, [searching, searchGroups]);

  // 본문 영역 높이(TopBar 실제 높이를 빼서 100vh에 딱 맞춤)
  const bodyHeight = useMemo(() => {
    const safe = Math.max(0, 100 - 0); // placeholder
    return `calc(100vh - ${topBarH}px)`;
  }, [topBarH]);

  // -----------------------------
  // ui
  // -----------------------------
  const TopBar = () => (
    <div ref={topBarRef} className="bg-white border-bottom" style={{ position: "sticky", top: 0, zIndex: 50 }}>
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

          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
            style={{ borderRadius: 12 }}
            onClick={() => loadGroupedSessions({ autoPickFirst: false })}
            title="목록 새로고침"
          >
            <RefreshCcw size={16} />
            <span className="d-none d-md-inline">새로고침</span>
          </button>
        </div>

        {errorBanner && (
          <div className="pb-3">
            <div className="alert alert-warning mb-0" style={{ borderRadius: 12 }}>
              {errorBanner}
            </div>
          </div>
        )}
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
          />
        </div>

        {(keyword.trim() || searching) && (
          <button
            className="btn btn-outline-secondary"
            style={{ borderRadius: 12 }}
            onClick={clearSearch}
            title="검색 초기화"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="d-flex align-items-center justify-content-between mt-2">
        <div className="small text-muted">
          {loadingSearch ? "검색 중..." : searching ? `검색 결과: ${totalSearchHits}건` : "최근 대화를 날짜별로 보여줍니다."}
        </div>
        <div className="small text-muted">{loadingSessions ? "목록 불러오는 중..." : ""}</div>
      </div>
    </div>
  );

  const Bubble = ({ m }) => {
    const isUser = safeLower(m.role) === "user";
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
              {fmtDateTime(m.createdAt)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const LeftPanel = () => (
    <div className="bg-white border rounded-4 shadow-sm overflow-hidden" style={{ height: "100%" }}>
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="fw-bold" style={{ color: "#059669" }}>
          {searching ? "검색 결과" : "대화 목록"}
        </div>
        <div className="small text-muted">{searching ? (loadingSearch ? "검색 중..." : "") : ""}</div>
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
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-semibold" style={{ fontSize: 13 }}>
                        세션 #{r.sessionId} · {String(r.role || "").toUpperCase()}
                      </div>
                      <div
                        className="text-muted"
                        style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {r.content}
                      </div>
                      {r.createdAt && (
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {fmtDateTime(r.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const s = item;
              const sid = s.sessionId ?? s.id;
              const active = String(sid) === String(activeSessionId);

              return (
                <div
                  key={sid ?? idx}
                  className="px-3 py-2 border-top"
                  style={{ cursor: "pointer", background: active ? "#ecfdf5" : "white" }}
                  onClick={() => {
                    setHighlightChatId(null);
                    setActiveSessionId(sid);
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="fw-semibold"
                        style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {s.title || "대화"}
                      </div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {s.lastMessageAt ? fmtDateTime(s.lastMessageAt) : (s.startTime ? fmtDateTime(s.startTime) : "")}
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
    <div
      className="bg-white border rounded-4 shadow-sm overflow-hidden"
      style={{
        height: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ✅ 헤더: 고정 */}
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

      {/* ✅ 메시지 영역: 남은 공간만 차지 + 스크롤 */}
      <div
        ref={chatAreaRef}
        className="p-3"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          background: "#f8fafc",
          paddingBottom: 24, // ✅ 마지막 말풍선 여유(잘림 방지)
        }}
      >
        {!activeSessionId && (
          <div className="p-4 text-center text-muted">
            왼쪽에서 대화를 선택하면 여기에서 전체 기록을 볼 수 있어요.
          </div>
        )}

        {activeSessionId && messages.length === 0 && !loadingMessages && (
          <div className="p-4 text-center text-muted">이 세션에는 대화가 없습니다.</div>
        )}

        {messages.map((m) => (
          <Bubble key={m.chatId} m={m} />
        ))}

        {loadingMessages && <div className="text-center text-muted py-3">불러오는 중...</div>}

        {/* ✅ 항상 바닥 여유 확보용(선택) */}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );


  // -----------------------------
  // layout
  // -----------------------------
  return (
    <div style={{ background: "#f8fafc", height: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />

      {/* ✅ TopBar 실제 높이를 빼고 남은 영역을 자동으로 채움 */}
      <div style={{ height: bodyHeight, minHeight: 0 }}>
        <div className="container py-4" style={{ maxWidth: 1200, height: "100%" }}>
          <div className="row g-3" style={{ height: "100%", marginLeft: 0, marginRight: 0 }}>
            {/* LEFT */}
            <div className="col-12 col-lg-4 d-flex flex-column" style={{ height: "100%" }}>
              <SearchBar />
              {/* SearchBar 아래 남은 공간을 list가 먹게 */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <LeftPanel />
              </div>
            </div>

            {/* RIGHT */}
            <div className="col-12 col-lg-8 d-flex flex-column" style={{ height: "100%", minWidth: 0 }}>
              <RightPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
