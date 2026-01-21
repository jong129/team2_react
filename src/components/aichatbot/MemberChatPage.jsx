// src/components/aichatbot/MemberChatPage.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Trash2, MessageSquareText, X, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import "./MemberChatPage.css";

// -----------------------------
// utils
// -----------------------------
const safeLower = (v) => String(v ?? "").toLowerCase();

// 채팅 시간 표시용
const fmtDateTime = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "";
  }
};

// 세션을 날짜별로 그룹핑하기 위한 키 (YYYY-MM-DD)
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

// 검색어가 있을 때 내용 중 검색어 부분만 강조
const renderHighlightedText = (text, keyword) => {
  const t = String(text ?? "");
  const k = String(keyword ?? "").trim();
  if (!k || k.length < 2) return t;

  const re = new RegExp(`(${escapeRegExp(k)})`, "gi");
  const parts = t.split(re);

  return parts.map((p, i) => {
    const isMatch = i % 2 === 1;
    if (!isMatch) return <React.Fragment key={i}>{p}</React.Fragment>;
    return (<mark key={i} className="mcp-mark">{p}</mark>);
  });
};

// 백엔드 메시지 응답이 {messages: [...]} 형태일 때 role이 섞여도 UI에서는 ai/user로 통일해서 bubble 스타일 적용
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

// 검색 API가 날짜별 그룹 DTO 형태로 줄수 있으니 프론트가 쓰기 좋은 {date, results}로 통일
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
// main
// -----------------------------
export default function MemberChatPage() {
  const PAGE_SIZE = 10;
  
  const navigate = useNavigate();
  
  // TopBar height
  const topBarRef = useRef(null);
  const topBarH = useElementHeight(topBarRef);

  // sessions (cursor paging)
  const [sessionsFlat, setSessionsFlat] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // active session
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSessionTitle, setActiveSessionTitle] = useState("");

  // messages
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // search
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchGroups, setSearchGroups] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [highlightChatId, setHighlightChatId] = useState(null);
  const [errorBanner, setErrorBanner] = useState("");

  // refs
  const chatAreaRef = useRef(null);
  const messageRefs = useRef(new Map());

  // -----------------------------
  // backend response parsing : 커서 기반 세션 목록 로딩 구조
  // -----------------------------
  const parseCursorResponse = (data) => {
    // items: items/content/sessions/list/data 중 하나에서 가져옴
    const items = data?.items ?? data?.content ?? data?.sessions ?? data?.list ?? data?.data ?? [];
    // nextCursor : nextCursor/cursor/next/next_cursor 중 하나
    const next = data?.nextCursor ?? data?.cursor ?? data?.next ?? data?.next_cursor ?? null;
    // hasMore가 없으면 size와 비교해서 추론
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
      // /api/chat/sessions?size=10 GET : 첫 페이지 로드
      const res = await axiosInstance.get("/api/chat/sessions", { params: { size: PAGE_SIZE } });
      const parsed = parseCursorResponse(res.data);
      const normalized = parsed.items.map(normalizeSessionItem);

      // sessionFlat 초기화 + nextCursor = hasMore 갱신
      setSessionsFlat(normalized);
      setNextCursor(parsed.nextCursor ?? null);
      setHasMore(parsed.hasMore);

      // 처음 들어왔고(activeSessionId가 null), 검색 중이 아니라면 첫 세션 자동 선택(UX)
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

  // 더보기 버튼을 눌렀을 때 cursor로 다음 페이지 가져와서 sessionFlat 뒤에 append. 검색 중일 땐 더보기 막음
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

  // /api/chat/sessions/{id}/messages?limit=500 GET : 메시지 로딩 
  const loadMessages = async (sessionId, { highlightId } = {}) => {
    if (!sessionId) return;
    setLoadingMessages(true);
    setErrorBanner("");

    try {
      const res = await axiosInstance.get(`/api/chat/sessions/${sessionId}/messages`, { params: { limit: 500 } });
      const normalized = normalizeMessages(res.data); 
      setMessages(normalized);  // 받은 messages를 normalize해서 세팅
      setHighlightChatId(highlightId ?? null);  // highlightChatId가 있으면 저장

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

  // /api/chat/sessions POST : 새 세션
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

  // /api/chat/sessions/{id} DELETE : 삭제 
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

  // /api/chat/messages/search?keyword=...&size=200 : 검색 기능 (Enter 기반)
  const runSearch = async (kw) => {
    const k = (kw ?? "").trim();

    // 빈 값이면 검색 종료 (clear)
    if (!k) {
      clearSearch();
      return;
    }

    // 2글자 미만이면 경고
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

  // 스크롤 처리
  useLayoutEffect(() => {
    if (!activeSessionId) return;
    if (!chatAreaRef.current) return;
    if (loadingMessages) return;

    // 메시지 로딩이 끝난 뒤, highlightChatId가 있으면 해당 메시지 DOM으로 scrollIntoView 
    if (highlightChatId != null) {
      const el = messageRefs.current.get(highlightChatId);
      if (el?.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // 없으면 채팅 영역 맨 아래로 스크롤
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

  // TopBar 높이를 CSS 변수로 주입(인라인 최소화)
  const pageStyle = useMemo(() => ({ "--topbar-h": `${topBarH}px` }), [topBarH]);

  // -----------------------------
  // ui parts
  // -----------------------------
  const TopBar = () => (
    <div ref={topBarRef} className="mcp-topbar">
      <div className="container mcp-container">
        <div className="mcp-topbar-row">
          <button className="btn btn-link mcp-back" onClick={() => navigate(-1)}>
            <ArrowLeft className="me-2" />
            뒤로
          </button>

          <div className="mcp-title">
            <MessageSquareText className="me-2" />
            AI 챗봇 대화 내역
          </div>

          <button className="btn btn-outline-secondary mcp-top-btn" onClick={loadSessionsFirst} title="목록 새로고침">
            <RefreshCcw size={16} />
            <span className="d-none d-md-inline">새로고침</span>
          </button>
        </div>

        {errorBanner && (
          <div className="mcp-topbar-error">
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
        className={`mcp-bubble-row ${isUser ? "is-user" : "is-ai"}`}
      >
        <div className={`mcp-bubble ${isUser ? "mcp-bubble-user" : "mcp-bubble-ai"} ${isHighlight ? "is-highlight" : ""}`}>
          {renderHighlightedText(m.content, searching ? searchKeyword : "")}
          {m.createdAt && <div className="mcp-bubble-time">{fmtDateTime(m.createdAt)}</div>}
        </div>
      </div>
    );
  };

  const LeftPanel = () => (
    <div className="mcp-panel">
      <div className="mcp-panel-head">
        <div className="mcp-head-title">{searching ? "검색 결과" : "대화 목록"}</div>

        {!searching && (
          <button className="btn btn-sm btn-success mcp-pill-btn" onClick={createSession} title="새 대화 만들기">
            + 새 대화
          </button>
        )}
      </div>

      <div className="mcp-left-scroll">
        {leftGroups.length === 0 && (
          <div className="mcp-empty">
            {searching ? "검색 결과가 없습니다." : loadingSessions ? "불러오는 중..." : "대화 내역이 없습니다."}
          </div>
        )}

        {leftGroups.map((g, gi) => (
          <div key={gi} className="mcp-group">
            <div className="mcp-group-header">{g.date}</div>

            {(searching ? g.results : g.sessions).map((item, idx) => {
              if (searching) {
                const r = item;
                return (
                  <div
                    key={`${r.chatId}-${idx}`}
                    className="mcp-list-item"
                    onClick={() => {
                      setHighlightChatId(r.chatId);
                      setActiveSessionId(r.sessionId);

                      const t = r.title ?? findTitleBySessionId(r.sessionId) ?? "";
                      setActiveSessionTitle(t || `세션 #${r.sessionId}`);
                    }}
                  >
                    <div className="mcp-search-title">세션 #{r.sessionId} · {String(r.role || "").toUpperCase()}</div>
                    <div className="mcp-ellipsis">{renderHighlightedText(r.content, searchKeyword)}</div>
                    {r.createdAt && <div className="mcp-small">{fmtDateTime(r.createdAt)}</div>}
                  </div>
                );
              }

              const s = item;
              const sid = s.sessionId;
              const active = String(sid) === String(activeSessionId);

              return (
                <div
                  key={sid ?? idx}
                  className={`mcp-list-item ${active ? "is-active" : ""}`}
                  onClick={() => {
                    setHighlightChatId(null);
                    setActiveSessionId(sid);
                    setActiveSessionTitle(s.title || "대화");
                  }}
                >
                  <div className="mcp-list-row">
                    <div className="mcp-minw-0">
                      <div className="mcp-session-title">{s.title || "대화"}</div>
                      <div className="mcp-session-sub">
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
        <div className="mcp-panel-foot">
          {hasMore ? (
            <button className="btn btn-outline-secondary w-100 mcp-more-btn" onClick={loadMoreSessions} disabled={loadingMore || loadingSessions}>
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
    <div className="mcp-panel mcp-right">
      <div className="mcp-panel-head">
        <div>
          <div className="mcp-head-title">대화 내용</div>
          <div className="mcp-right-sub">
            {activeSessionId ? activeSessionTitle || `세션 #${activeSessionId}` : "왼쪽에서 대화를 선택하세요"}
          </div>
        </div>
        <div className="small text-muted">{loadingMessages ? "불러오는 중..." : ""}</div>
      </div>

      <div ref={chatAreaRef} className="mcp-chat-area">
        {!activeSessionId && <div className="mcp-empty">왼쪽에서 대화를 선택하면 여기에서 전체 기록을 볼 수 있어요.</div>}

        {activeSessionId && messages.length === 0 && !loadingMessages && <div className="mcp-empty">이 세션에는 대화가 없습니다.</div>}

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
    <div className="mcp-page" style={pageStyle}>
      <TopBar />

      <div className="mcp-body">
        <div className="container mcp-container mcp-body-inner">
          <div className="row g-3 mcp-grid">
            {/* LEFT */}
            <div className="col-12 col-lg-4 d-flex flex-column mcp-col">
              {/* Search Bar */}
              <div className="mcp-searchbar">
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

                  <button className="btn btn-success mcp-search-btn" onClick={() => runSearch(keyword)} disabled={loadingSearch} title="검색">
                    {loadingSearch ? "검색중..." : "검색"}
                  </button>

                  {(keyword.trim() || searching) && (
                    <button className="btn btn-outline-secondary mcp-clear-btn" onClick={clearSearch} title="검색 초기화" disabled={loadingSearch}>
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="mcp-searchbar-sub">
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
