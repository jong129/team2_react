// src/components/aichatbot/AdminChatPage.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import {Search,Trash2,RefreshCcw,RotateCcw,ShieldAlert,MessageSquareText,ArrowLeft,} from "lucide-react";
import "./AdminChatPage.css";

// -----------------------------
// utils
// -----------------------------
// role 비교할 때 USER,user,null 등이 섞여도 안전하게 처리하려고 소문자로 통일
const safeLower = (v) => String(v ?? "").toLowerCase();

// ISO 날짜 문자열을 toLocaleString()으로 보기 좋게 포맷
const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? ""; // 파싱 실패하면 원본을 그대로 반환
  }
};

// 특수문자 들어와도 깨지지 않게 방지
const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 검색어(q)가 있을 때, 세션 제목에서 검색어 부분을 하이라이트
const renderHighlightedText = (text, keyword) => {
  const t = String(text ?? "");
  const k = String(keyword ?? "").trim();
  if (!k || k.length < 2) return t;

  const re = new RegExp(`(${escapeRegExp(k)})`, "gi");
  const parts = t.split(re);

  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="acp-mark">
        {p}
      </mark>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
};

// TopBar height hook (TopBar 높이 측정)
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
// 분리 components
// -----------------------------
// TopBar
function TopBar({ topBarRef, error, onRefresh, onGoDashboard }) {
  return (
    <div ref={topBarRef} className="acp-topbar">
      <div className="container acp-container">
        <div className="acp-topbar-row">
          <div className="acp-top-title">
            <ShieldAlert />
            관리자 · 세션 관리
          </div>

          <div className="acp-top-actions">
            <button className="btn btn-outline-secondary acp-top-btn" onClick={onGoDashboard} title="관리자 대시보드로">
              <ArrowLeft size={16} />
              <span className="d-none d-md-inline">대시보드</span>
            </button>

            <button className="btn btn-outline-secondary acp-top-btn" onClick={onRefresh} title="새로고침">
              <RefreshCcw size={16} />
              <span className="d-none d-md-inline">새로고침</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="acp-topbar-error">
            <div className="alert alert-warning mb-0 acp-alert">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// LeftPanel : 세션 목록 + 필터 + 페이징 + 삭제/복구
function LeftPanel({status,setStatus,memberId,setMemberId,q,setQ,onRunSearch,loadingList,pageInfo,
  page,totalPages,list,activeSessionId,onSelectSession,onSoftDelete,onRestore,onHardDelete,onPrev,
  onNext,
}) {
  return (
    <div className="acp-panel acp-left">
      {/* filters (필터 UI) */}
      <div className="acp-left-filters">
        <div className="acp-left-filter-row">
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DELETED">DELETED</option>
            <option value="">ALL</option>
          </select>

          <input
            className="form-control acp-memberid"
            placeholder="memberId"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent?.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                onRunSearch();
              }
            }}
          />
        </div>

        <div className="input-group">
          <span className="input-group-text bg-light border-0"><Search size={18} /></span>

          <input
            className="form-control bg-light border-0"
            placeholder="title 검색 (Enter)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent?.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                onRunSearch();
              }
            }}
          />

          <button className="btn btn-success acp-search-btn" type="button" onClick={onRunSearch} disabled={loadingList}>
            {loadingList ? "검색중..." : "검색"}
          </button>
        </div>

        <div className="acp-left-meta">
          {loadingList ? "불러오는 중..." : `총 ${pageInfo.totalElements}건 · ${page + 1}/${Math.max(1, totalPages)}`}
        </div>
      </div>

      {/* list (목록 렌더링) */}
      <div className="acp-left-scroll">
        {list.length === 0 && <div className="acp-empty">세션이 없습니다.</div>}

        {list.map((s) => {
          const sid = s.sessionId;
          const active = String(sid) === String(activeSessionId);
          const messageCount = Number(s.messageCount ?? 0);

          return (
            <div
              key={sid}
              className={`acp-list-item ${active ? "is-active" : ""}`}
              onClick={() => onSelectSession(sid)}
              role="button"
              tabIndex={0}
            >
              <div className="acp-list-item-row">
                <div className="acp-minw-0">
                  <div className="acp-list-item-top">
                    <div className="acp-session-line">
                      #{sid} · member {s.memberId} · {s.status}
                    </div>

                    <span className="badge acp-count-badge" title="메시지 개수">
                      <MessageSquareText size={14} />
                      {messageCount}
                    </span>
                  </div>

                  <div className="text-muted acp-ellipsis">{renderHighlightedText(s.title || "새 대화", q)}</div>
                  <div className="text-muted acp-sub-line">last: {s.lastMessageAt ? fmt(s.lastMessageAt) : "-"}</div>
                </div>

                <div className="acp-actions">
                  {s.status !== "DELETED" ? (
                    <button
                      className="btn btn-sm btn-link text-danger acp-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSoftDelete(sid);
                      }}
                      title="삭제(숨김)"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-link text-secondary acp-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestore(sid);
                      }}
                      title="복구"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}

                  <button
                    className="btn btn-sm btn-danger acp-hard-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHardDelete(sid);
                    }}
                    title="영구삭제(복원 불가)"
                  >
                    영구삭제
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* pagination (페이징) */}
      <div className="acp-left-pagination">
        <button className="btn btn-outline-secondary btn-sm" disabled={page <= 0 || loadingList} onClick={onPrev}>
          이전
        </button>
        <div className="small text-muted">
          page {page + 1} / {Math.max(1, totalPages)}
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={page + 1 >= totalPages || loadingList}
          onClick={onNext}
        >
          다음
        </button>
      </div>
    </div>
  );
}

// RightPanel : 선택한 세션의 메시지 목록
function RightPanel({ activeSessionId, messages, loadingMessages }) {
  return (
    <div className="acp-panel acp-right">
      <div className="acp-right-head">
        <div>
          <div className="fw-bold acp-accent">세션 상세</div>
          <div className="text-muted acp-right-sub">
            {activeSessionId ? `세션 #${activeSessionId}` : "왼쪽에서 세션을 선택하세요"}
          </div>
        </div>
        <div className="small text-muted">{loadingMessages ? "불러오는 중..." : ""}</div>
      </div>

      <div className="acp-chat-area">
        {!activeSessionId && <div className="acp-empty">세션을 선택하면 메시지가 보입니다.</div>}

        {activeSessionId && messages.length === 0 && !loadingMessages && <div className="acp-empty">메시지가 없습니다.</div>}

        {messages.map((m) => {
          const isUser = safeLower(m.role) === "user";
          return (
            <div key={m.chatId} className={`acp-bubble-row ${isUser ? "is-user" : "is-ai"}`}>
              <div className={`acp-bubble ${isUser ? "acp-bubble-user" : "acp-bubble-ai"}`}>
                {m.content}
                {m.createdAt && <div className="acp-bubble-time">{fmt(m.createdAt)}</div>}
              </div>
            </div>
          );
        })}

        {loadingMessages && <div className="text-center text-muted py-3">불러오는 중...</div>}
      </div>

      <div className="acp-right-foot" />
    </div>
  );
}

// -----------------------------
// main
// -----------------------------
export default function AdminChatPage() {
  const PAGE_SIZE = 7;

  const navigate = useNavigate();

  // TopBar height
  const topBarRef = useRef(null);
  const topBarH = useElementHeight(topBarRef);

  // filters
  const [status, setStatus] = useState("ACTIVE");
  const [memberId, setMemberId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  // list
  const [loadingList, setLoadingList] = useState(false);
  const [list, setList] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, size: PAGE_SIZE, totalPages: 0, totalElements: 0 });

  // active session & messages
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // error
  const [error, setError] = useState("");

  // /api/admin/chat/sessions GET : API 호출 
  const loadList = async (nextPage = page) => {
    setLoadingList(true);
    setError("");

    try {
      const params = {
        status: status || undefined,  // 없으면 전체
        memberId: memberId.trim() ? Number(memberId.trim()) : undefined,  // 입력 시 Number로
        q: q.trim() ? q.trim() : undefined, // 입력 시만
        page: nextPage,
        size: PAGE_SIZE,
      };

      const res = await axiosInstance.get("/api/admin/chat/sessions", { params });
      const content = res.data?.content ?? [];

      setList(content); // 응답 content를 list에 저장
      setPageInfo({ // pageInfo 갱신
        page: res.data?.page ?? nextPage,
        size: res.data?.size ?? PAGE_SIZE,
        totalPages: res.data?.totalPages ?? 0,
        totalElements: res.data?.totalElements ?? 0,
      });

      // activeSessionId가 아직 없으면 첫 세션 자동 선택 (UX)
      const first = content?.[0];
      if (first?.sessionId && activeSessionId == null) setActiveSessionId(first.sessionId);
    } catch (e) {
      console.error(e);
      setError("⚠️ 관리자 세션 목록을 불러오지 못했습니다. (권한/서버 확인)");
      setList([]);
    } finally {
      setLoadingList(false);
    }
  };

  // /api/admin/chat/sessions/{sid}/messages GET : 오른쪽 패널 메시지 갱신
  const loadMessages = async (sid) => {
    if (!sid) return;
    setLoadingMessages(true);
    setError("");

    try {
      const res = await axiosInstance.get(`/api/admin/chat/sessions/${sid}/messages`);
      setMessages(res.data?.messages ?? []);
    } catch (e) {
      console.error(e);
      setMessages([]);
      setError("⚠️ 세션 메시지를 불러오지 못했습니다.");
    } finally {
      setLoadingMessages(false);
    }
  };

  // status 변경되면 page 0으로 초기화하고 목록 재조회
  useEffect(() => {
    setPage(0);
    loadList(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // activeSessionId 변경되면 해당 세션 메시지 조회
  useEffect(() => {
    if (!activeSessionId) return;
    loadMessages(activeSessionId);
  }, [activeSessionId]);

  const onRunSearch = () => {
    setPage(0);
    loadList(0);
  };

  const totalPages = pageInfo.totalPages ?? 0;

  const onPrev = () => {
    if (page <= 0 || loadingList) return;
    const np = page - 1;
    setPage(np);
    loadList(np);
  };

  const onNext = () => {
    if (page + 1 >= totalPages || loadingList) return;
    const np = page + 1;
    setPage(np);
    loadList(np);
  };

  // 삭제
  const onSoftDelete = async (sid) => {
    const ok = window.confirm(`세션 #${sid}를 삭제(숨김) 처리할까요?`);
    if (!ok) return;

    try {
      await axiosInstance.delete(`/api/admin/chat/sessions/${sid}`);
      await loadList(page);

      if (String(activeSessionId) === String(sid)) {
        setMessages([]);
        setActiveSessionId(null);
      }
    } catch (e) {
      console.error(e);
      alert("삭제 실패(서버/권한 확인)");
    }
  };

  // 복구
  const onRestore = async (sid) => {
    const ok = window.confirm(`세션 #${sid}를 복구(ACTIVE)할까요?`);
    if (!ok) return;

    try {
      await axiosInstance.patch(`/api/admin/chat/sessions/${sid}/restore`);
      await loadList(page);
    } catch (e) {
      console.error(e);
      alert("복구 실패(서버/권한 확인)");
    }
  };

  // 영구삭제
  const onHardDelete = async (sid) => {
    const ok = window.confirm(
      `⚠️ 세션 #${sid}를 영구삭제할까요?\n삭제 후에는 복구할 수 없고, 메시지도 함께 삭제됩니다.`
    );
    if (!ok) return;

    try {
      await axiosInstance.delete(`/api/admin/chat/sessions/${sid}/hard`);
      await loadList(page);

      if (String(activeSessionId) === String(sid)) {
        setMessages([]);
        setActiveSessionId(null);
      }
    } catch (e) {
      console.error(e);
      alert("영구삭제 실패(서버/권한 확인)");
    }
  };

  // TopBar 높이를 CSS 변수로 넘겨서 인라인 최소화
  const pageStyle = useMemo(() => ({ "--topbar-h": `${topBarH}px` }), [topBarH]);

  return (
    <div className="acp-page" style={pageStyle}>
      <TopBar
        topBarRef={topBarRef}
        error={error}
        onRefresh={() => loadList(page)}
        onGoDashboard={() => navigate("/admin/dashboard")}
      />

      <div className="acp-body">
        <div className="container acp-container acp-body-inner">
          <div className="row g-3 acp-grid">
            <div className="col-12 col-lg-4 d-flex flex-column acp-col">
              <LeftPanel
                status={status}
                setStatus={setStatus}
                memberId={memberId}
                setMemberId={setMemberId}
                q={q}
                setQ={setQ}
                onRunSearch={onRunSearch}
                loadingList={loadingList}
                pageInfo={pageInfo}
                page={page}
                totalPages={totalPages}
                list={list}
                activeSessionId={activeSessionId}
                onSelectSession={setActiveSessionId}
                onSoftDelete={onSoftDelete}
                onRestore={onRestore}
                onHardDelete={onHardDelete}
                onPrev={onPrev}
                onNext={onNext}
              />
            </div>

            <div className="col-12 col-lg-8 d-flex flex-column acp-col acp-col-right">
              <RightPanel activeSessionId={activeSessionId} messages={messages} loadingMessages={loadingMessages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
