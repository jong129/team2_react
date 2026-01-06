import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Trash2, MessageSquareText, X, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import "./MemberChatPage.css";

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

const fmtDateKey = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
};

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderHighlightedText = (text, keyword) => {
  const t = String(text ?? "");
  const k = String(keyword ?? "").trim();
  if (!k || k.length < 2) return t;

  const re = new RegExp(`(${escapeRegExp(k)})`, "gi");
  const parts = t.split(re);

  return parts.map((p, i) => {
    const isMatch = i % 2 === 1;
    if (!isMatch) return <React.Fragment key={i}>{p}</React.Fragment>;
    return (
      <mark key={i} className="mcp-mark">
        {p}
      </mark>
    );
  });
};

const normalizeMessages = (data) => {
  const arr = data?.messages;
  if (!Array.isArray(arr)) return [];
  return arr.map((m, idx) => {
    const roleRaw = safeLower(m.role || "ai");
    const role = roleRaw === "assistant" ? "ai" : roleRaw === "user" ? "user" : "ai";
    return {
      chatId: m.chatId ?? m.id ?? idx,
      role,
      content: m.content ?? "",
      createdAt: m.createdAt ?? null,
    };
  });
};

const normalizeSearchGroups = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map((g) => ({
    date: g.date ?? g.key ?? g.groupKey ?? "",
    results: Array.isArray(g.results) ? g.results : Array.isArray(g.items) ? g.items : [],
  }));
};

// TopBar height hook (ResizeObserver)
const useElementHeight = (ref) => {
  const [h, setH] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setH(el.getBoundingClientRect().height || 0);
    update();

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
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
export default function MemberChatPage() {
  const navigate = useNavigate();
  const PAGE_SIZE = 10;

  // ---- TopBar height
  const topBarRef = useRef(null);
  const topBarH = useElementHeight(topBarRef);

  // ---- sessions (cursor paging)
  const [sessionsFlat, setSessionsFlat] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ---- active session
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSessionTitle, setActiveSessionTitle] = useState("");

  // ---- messages
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ---- search (Enter only)
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchGroups, setSearchGroups] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [highlightChatId, setHighlightChatId] = useState(null);
  const [errorBanner, setErrorBanner] = useState("");

  // ---- refs
  const chatAreaRef = useRef(null);
  const messageRefs = useRef(new Map());

  // -----------------------------
  // backend response parsing (safe)
  // -----------------------------
  const parseCursorResponse = (data) => {
    const items = data?.items ?? data?.content ?? data?.sessions ?? data?.list ?? data?.data ?? [];
    const next = data?.nextCursor ?? data?.cursor ?? data?.next ?? data?.next_cursor ?? null;
    const more = data?.hasMore ?? data?.has_more ?? (Array.isArray(items) ? items.length === PAGE_SIZE : false);

    return { items: Array.isArray(items) ? items : [], nextCursor: next, hasMore: !!more };
  };

  const normalizeSessionItem = (s) => {
    const sessionId = s.sessionId ?? s.id;
    return {
      sessionId,
      title: s.title ?? "새 대화",
      startTime: s.startTime ?? s.createdAt ?? null,
      lastMessageAt: s.lastMessageAt ?? s.updatedAt ?? s.startTime ?? null,
      deletedAt: s.deletedAt ?? null,
    };
  };

  const groupSessionsByDate = (flat) => {
    const m = new Map();
    for (const raw of flat) {
      const s = normalizeSessionItem(raw);
      const dateKey = fmtDateKey(s.lastMessageAt || s.startTime) || "기타";
      if (!m.has(dateKey)) m.set(dateKey, []);
      m.get(dateKey).push(s);
    }

    const keys = Array.from(m.keys()).sort((a, b) => (a < b ? 1 : -1));

    return keys.map((k) => ({
      date: k,
      sessions: (m.get(k) || []).sort((a, b) => {
        const ta = new Date(a.lastMessageAt || a.startTime || 0).getTime();
        const tb = new Date(b.lastMessageAt || b.startTime || 0).getTime();
        return tb - ta;
      }),
    }));
  };

  const findTitleBySessionId = (sid) => {
    const s = sessionsFlat.find((x) => String(x.sessionId ?? x.id) === String(sid));
    if (!s) return "";
    return s.title ?? "";
  };

  // -----------------------------
  // api
  // -----------------------------
  const loadSessionsFirst = async () => {
    setLoadingSessions(true);
    setErrorBanner("");
    try {
      const res = await axiosInstance.get("/api/chat/sessions", { params: { size: PAGE_SIZE } });

      const parsed = parseCursorResponse(res.data);
      const normalized = parsed.items.map(normalizeSessionItem);

      setSessionsFlat(normalized);
      setNextCursor(parsed.nextCursor ?? null);
      setHasMore(parsed.hasMore);

      const first = normalized?.[0];
      if (!searching && first?.sessionId && activeSessionId == null) {
        setActiveSessionId(first.sessionId);
        setActiveSessionTitle(first.title ?? "");
      }
    } catch (e) {
      console.error("세션 목록 로드 실패:", e);
      setSessionsFlat([]);
      setHasMore(false);
      setErrorBanner("⚠️ 대화 목록을 불러오지 못했습니다. (서버/로그인 상태 확인)");
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMoreSessions = async () => {
    if (!hasMore || loadingMore || searching) return;

    setLoadingMore(true);
    setErrorBanner("");
    try {
      const res = await axiosInstance.get("/api/chat/sessions", {
        params: { size: PAGE_SIZE, cursor: nextCursor || undefined },
      });

      const parsed = parseCursorResponse(res.data);
      const normalized = parsed.items.map(normalizeSessionItem);

      setSessionsFlat((prev) => [...prev, ...normalized]);
      setNextCursor(parsed.nextCursor ?? null);
      setHasMore(parsed.hasMore);
    } catch (e) {
      console.error("더보기 실패:", e);
      setErrorBanner("⚠️ 더보기에 실패했습니다.");
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMessages = async (sessionId, { highlightId } = {}) => {
    if (!sessionId) return;
    setLoadingMessages(true);
    setErrorBanner("");

    try {
      const res = await axiosInstance.get(`/api/chat/sessions/${sessionId}/messages`, { params: { limit: 500 } });
      const normalized = normalizeMessages(res.data);
      setMessages(normalized);
      setHighlightChatId(highlightId ?? null);

      if (!activeSessionTitle) {
        const t = findTitleBySessionId(sessionId);
        if (t) setActiveSessionTitle(t);
      }
    } catch (e) {
      console.error("메시지 로드 실패:", e);
      setMessages([{ chatId: "err", role: "ai", content: "⚠️ 대화 내용을 불러오지 못했습니다.", createdAt: null }]);
      setErrorBanner("⚠️ 대화 내용을 불러오지 못했습니다.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const createSession = async () => {
    setErrorBanner("");
    try {
      const res = await axiosInstance.post("/api/chat/sessions", { title: "새 대화" });
      const newId = res?.data?.sessionId ?? res?.data?.id;

      clearSearch();
      await loadSessionsFirst();

      if (newId) {
        setActiveSessionId(newId);
        setActiveSessionTitle("새 대화");
        setMessages([]);
        setHighlightChatId(null);
      }
    } catch (e) {
      console.error("세션 생성 실패:", e);
      setErrorBanner("⚠️ 새 대화를 만들지 못했습니다.");
    }
  };

  const deleteSession = async (sessionId) => {
    if (!sessionId) return;
    const ok = window.confirm("이 대화를 삭제할까요? (목록에서 숨김 처리됩니다)");
    if (!ok) return;

    try {
      await axiosInstance.delete(`/api/chat/sessions/${sessionId}`);
      setActiveSessionId((prev) => (String(prev) === String(sessionId) ? null : prev));
      setMessages((prev) => (String(activeSessionId) === String(sessionId) ? [] : prev));
      await loadSessionsFirst();
    } catch (e) {
      console.error("세션 삭제 실패:", e);
      alert("삭제에 실패했습니다. (권한/서버 로그 확인)");
    }
  };

  const runSearch = async (kw) => {
    const k = (kw ?? "").trim();

    if (!k) {
      clearSearch();
      return;
    }

    if (k.length < 2) {
      setSearching(false);
      setSearchGroups([]);
      setHighlightChatId(null);
      setSearchKeyword("");
      setErrorBanner("⚠️ 검색어는 2글자 이상 입력 후 Enter를 눌러주세요.");
      return;
    }

    setSearching(true);
    setLoadingSearch(true);
    setErrorBanner("");
    setSearchKeyword(k);

    try {
      const res = await axiosInstance.get("/api/chat/messages/search", { params: { keyword: k, size: 200 } });
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
    setSearchKeyword("");
    setSearching(false);
    setSearchGroups([]);
    setHighlightChatId(null);
    setErrorBanner("");
  };

  // -----------------------------
  // effects
  // -----------------------------
  useEffect(() => {
    loadSessionsFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    loadMessages(activeSessionId, { highlightId: highlightChatId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  useLayoutEffect(() => {
    if (!activeSessionId) return;
    if (!chatAreaRef.current) return;
    if (loadingMessages) return;

    if (highlightChatId != null) {
      const el = messageRefs.current.get(highlightChatId);
      if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    chatAreaRef.current.scrollTo({ top: chatAreaRef.current.scrollHeight, behavior: "smooth" });
  }, [activeSessionId, loadingMessages, messages, highlightChatId]);

  // -----------------------------
  // derived
  // -----------------------------
  const groupedSessions = useMemo(() => groupSessionsByDate(sessionsFlat), [sessionsFlat]);
  const leftGroups = useMemo(() => (searching ? searchGroups : groupedSessions), [searching, searchGroups, groupedSessions]);

  const totalSearchHits = useMemo(() => {
    if (!searching) return 0;
    return (searchGroups || []).reduce((acc, g) => acc + (g.results?.length || 0), 0);
  }, [searching, searchGroups]);

  // ✅ 인라인로 남겨둘 “동적 값” (topBar 높이)
  const bodyHeight = useMemo(() => `calc(100vh - ${topBarH}px)`, [topBarH]);

  // -----------------------------
  // ui
  // -----------------------------
  const TopBar = () => (
    <div ref={topBarRef} className="mcp-topbar bg-white border-bottom">
      <div className="container mcp-container">
        <div className="d-flex align-items-center justify-content-between py-3">
          <button className="btn btn-link text-decoration-none" onClick={() => navigate(-1)}>
            <ArrowLeft className="me-2" />
            뒤로
          </button>

          <div className="fw-bold d-flex align-items-center mcp-title">
            <MessageSquareText className="me-2" />
            AI 챗봇 대화 내역
          </div>

          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-2 mcp-refresh-btn"
            onClick={() => loadSessionsFirst()}
            title="목록 새로고침"
          >
            <RefreshCcw size={16} />
            <span className="d-none d-md-inline">새로고침</span>
          </button>
        </div>

        {errorBanner && (
          <div className="pb-3">
            <div className="alert alert-warning mb-0 mcp-alert">{errorBanner}</div>
          </div>
        )}
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
        className={[
          "mcp-bubble-row",
          "mb-3",
          "d-flex",
          isUser ? "mcp-bubble-row-user" : "mcp-bubble-row-ai",
        ].join(" ")}
      >
        <div
          className={[
            "mcp-bubble",
            "shadow-sm",
            isUser ? "mcp-bubble-user" : "mcp-bubble-ai",
            isHighlight ? "mcp-bubble-highlight" : "",
          ].join(" ")}
        >
          {renderHighlightedText(m.content, searching ? searchKeyword : "")}

          {m.createdAt && <div className="mcp-bubble-time mt-2">{fmtDateTime(m.createdAt)}</div>}
        </div>
      </div>
    );
  };

  const LeftPanel = () => (
    <div className="mcp-panel bg-white border rounded-4 shadow-sm overflow-hidden">
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="fw-bold mcp-accent">{searching ? "검색 결과" : "대화 목록"}</div>

        {!searching && (
          <button className="btn btn-sm btn-success mcp-pill-btn" onClick={createSession} title="새 대화 만들기">
            + 새 대화
          </button>
        )}
      </div>

      <div className="mcp-left-scroll">
        {leftGroups.length === 0 && (
          <div className="p-4 text-center text-muted">
            {searching ? "검색 결과가 없습니다." : loadingSessions ? "불러오는 중..." : "대화 내역이 없습니다."}
          </div>
        )}

        {leftGroups.map((g, gi) => (
          <div key={gi} className="border-bottom">
            <div className="px-3 py-2 fw-semibold mcp-group-header">{g.date}</div>

            {(searching ? g.results : g.sessions).map((item, idx) => {
              if (searching) {
                const r = item;
                return (
                  <div
                    key={`${r.chatId}-${idx}`}
                    className="px-3 py-2 border-top mcp-list-item"
                    onClick={() => {
                      setHighlightChatId(r.chatId);
                      setActiveSessionId(r.sessionId);

                      const t = r.title ?? findTitleBySessionId(r.sessionId) ?? "";
                      setActiveSessionTitle(t || `세션 #${r.sessionId}`);
                    }}
                  >
                    <div className="mcp-minw-0">
                      <div className="fw-semibold mcp-search-title">
                        세션 #{r.sessionId} · {String(r.role || "").toUpperCase()}
                      </div>
                      <div className="text-muted mcp-ellipsis">
                        {renderHighlightedText(r.content, searchKeyword)}
                      </div>
                      {r.createdAt && <div className="text-muted mcp-small">{fmtDateTime(r.createdAt)}</div>}
                    </div>
                  </div>
                );
              }

              const s = item;
              const sid = s.sessionId;
              const active = String(sid) === String(activeSessionId);

              return (
                <div
                  key={sid ?? idx}
                  className={["px-3", "py-2", "border-top", "mcp-list-item", active ? "is-active" : ""].join(" ")}
                  onClick={() => {
                    setHighlightChatId(null);
                    setActiveSessionId(sid);
                    setActiveSessionTitle(s.title || "대화");
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <div className="mcp-minw-0">
                      <div className="fw-semibold mcp-session-title">
                        {s.title || "대화"}
                      </div>
                      <div className="text-muted mcp-session-sub">
                        {s.lastMessageAt ? fmtDateTime(s.lastMessageAt) : s.startTime ? fmtDateTime(s.startTime) : ""}
                      </div>
                    </div>

                    <button
                      className="btn btn-sm btn-link text-danger mcp-trash-btn"
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

      {!searching && sessionsFlat.length >= PAGE_SIZE && (
        <div className="p-3 border-top bg-white">
          {hasMore ? (
            <button
              className="btn btn-outline-secondary w-100 mcp-more-btn"
              onClick={loadMoreSessions}
              disabled={loadingMore || loadingSessions}
            >
              {loadingMore ? "불러오는 중..." : "더보기"}
            </button>
          ) : (
            <div className="text-center text-muted small">마지막입니다.</div>
          )}

          <div className="text-center text-muted small mt-2">불러온 대화: {sessionsFlat.length}개</div>
        </div>
      )}
    </div>
  );

  const RightPanel = () => (
    <div className="mcp-panel mcp-right bg-white border rounded-4 shadow-sm overflow-hidden">
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
        <div>
          <div className="fw-bold mcp-accent">대화 내용</div>
          <div className="text-muted mcp-right-sub">
            {activeSessionId ? activeSessionTitle || `세션 #${activeSessionId}` : "왼쪽에서 대화를 선택하세요"}
          </div>
        </div>
        <div className="small text-muted">{loadingMessages ? "불러오는 중..." : ""}</div>
      </div>

      <div ref={chatAreaRef} className="mcp-chat-area p-3">
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

        <div className="mcp-chat-bottom-spacer" />
      </div>
    </div>
  );

  // -----------------------------
  // layout
  // -----------------------------
  return (
    <div className="mcp-page">
      <TopBar />

      {/* ✅ 동적 높이만 인라인 유지 */}
      <div className="mcp-body" style={{ height: bodyHeight }}>
        <div className="container py-4 mcp-container mcp-body-inner">
          <div className="row g-3 mcp-row">
            {/* LEFT */}
            <div className="col-12 col-lg-4 d-flex flex-column mcp-col">
              {/* SearchBar */}
              <div className="p-3 border-bottom bg-white">
                <div className="input-group">
                  <span className="input-group-text bg-light border-0">
                    <Search size={18} />
                  </span>

                  <input
                    className="form-control bg-light border-0"
                    placeholder="키워드로 대화 검색 (Enter로 검색)"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runSearch(keyword);
                    }}
                    disabled={loadingSearch}
                  />

                  <button
                    className="btn btn-success mcp-search-btn"
                    onClick={() => runSearch(keyword)}
                    disabled={loadingSearch}
                    title="검색"
                  >
                    {loadingSearch ? "검색중..." : "검색"}
                  </button>

                  {(keyword.trim() || searching) && (
                    <button
                      className="btn btn-outline-secondary mcp-clear-btn"
                      onClick={clearSearch}
                      title="검색 초기화"
                      disabled={loadingSearch}
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="d-flex align-items-center justify-content-between mt-2">
                  <div className="small text-muted">
                    {loadingSearch
                      ? "검색 중..."
                      : searching
                      ? `검색 결과: ${totalSearchHits}건`
                      : "Enter 또는 검색 버튼으로 검색합니다. (2글자 이상)"}
                  </div>
                  <div className="small text-muted">{loadingSessions ? "목록 불러오는 중..." : ""}</div>
                </div>
              </div>

              {/* list */}
              <div className="mcp-flex-fill">
                <LeftPanel />
              </div>
            </div>

            {/* RIGHT */}
            <div className="col-12 col-lg-8 d-flex flex-column mcp-col mcp-col-right">
              <RightPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
