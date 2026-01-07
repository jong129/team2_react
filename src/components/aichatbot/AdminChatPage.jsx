import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import {
  Search,
  Trash2,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  MessageSquareText,
  ArrowLeft,
} from "lucide-react";
import "./AdminChatPage.css";

// -----------------------------
// utils
// -----------------------------
const safeLower = (v) => String(v ?? "").toLowerCase();
const fmt = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "";
  }
};

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
// 분리 컴포넌트 (재마운트 방지)
// -----------------------------
function TopBar({ topBarRef, error, onRefresh, onGoDashboard }) {
  return (
    <div ref={topBarRef} className="acp-topbar bg-white border-bottom">
      <div className="container acp-container">
        <div className="d-flex align-items-center justify-content-between py-3">
          <div className="fw-bold d-flex align-items-center gap-2 acp-top-title">
            <ShieldAlert /> 관리자 · 세션 관리
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
              onClick={onGoDashboard}
              title="관리자 대시보드로"
            >
              <ArrowLeft size={16} />
              <span className="d-none d-md-inline">대시보드</span>
            </button>

            <button
              className="btn btn-outline-secondary d-flex align-items-center gap-2 acp-refresh-btn"
              onClick={onRefresh}
              title="새로고침"
            >
              <RefreshCcw size={16} />
              <span className="d-none d-md-inline">새로고침</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="pb-3">
            <div className="alert alert-warning mb-0 acp-alert">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function LeftPanel({
  status,
  setStatus,
  memberId,
  setMemberId,
  q,
  setQ,
  onRunSearch,
  loadingList,
  pageInfo,
  page,
  totalPages,
  list,
  activeSessionId,
  onSelectSession,
  onSoftDelete,
  onRestore,
  onHardDelete,
  onPrev,
  onNext,
}) {
  return (
    <div className="acp-panel bg-white border rounded-4 shadow-sm overflow-hidden">
      {/* filters */}
      <div className="p-3 border-bottom">
        <div className="d-flex gap-2 align-items-center mb-2">
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
          <span className="input-group-text bg-light border-0">
            <Search size={18} />
          </span>

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

        <div className="small text-muted mt-2">
          {loadingList ? "불러오는 중..." : `총 ${pageInfo.totalElements}건 · ${page + 1}/${Math.max(1, totalPages)}`}
        </div>
      </div>

      {/* list */}
      <div className="acp-left-scroll">
        {list.length === 0 && <div className="p-4 text-center text-muted">세션이 없습니다.</div>}

        {list.map((s) => {
          const sid = s.sessionId;
          const active = String(sid) === String(activeSessionId);
          const messageCount = Number(s.messageCount ?? 0);

          return (
            <div
              key={sid}
              className={["px-3", "py-2", "border-top", "acp-list-item", active ? "is-active" : ""].join(" ")}
              onClick={() => onSelectSession(sid)}
            >
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div className="acp-minw-0">
                  <div className="d-flex align-items-center gap-2 acp-minw-0">
                    <div className="fw-semibold acp-session-line">
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

                <div className="d-flex gap-1 acp-actions">
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

      {/* pagination */}
      <div className="p-3 border-top bg-white d-flex justify-content-between align-items-center">
        <button className="btn btn-outline-secondary btn-sm" disabled={page <= 0 || loadingList} onClick={onPrev}>
          이전
        </button>
        <div className="small text-muted">
          page {page + 1} / {Math.max(1, totalPages)}
        </div>
        <button className="btn btn-outline-secondary btn-sm" disabled={page + 1 >= totalPages || loadingList} onClick={onNext}>
          다음
        </button>
      </div>
    </div>
  );
}

function RightPanel({ activeSessionId, messages, loadingMessages }) {
  return (
    <div className="acp-panel bg-white border rounded-4 shadow-sm overflow-hidden acp-right">
      <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
        <div>
          <div className="fw-bold acp-accent">세션 상세</div>
          <div className="text-muted acp-right-sub">
            {activeSessionId ? `세션 #${activeSessionId}` : "왼쪽에서 세션을 선택하세요"}
          </div>
        </div>
        <div className="small text-muted">{loadingMessages ? "불러오는 중..." : ""}</div>
      </div>

      <div className="acp-chat-area p-3">
        {!activeSessionId && <div className="p-4 text-center text-muted">세션을 선택하면 메시지가 보입니다.</div>}

        {activeSessionId && messages.length === 0 && !loadingMessages && (
          <div className="p-4 text-center text-muted">메시지가 없습니다.</div>
        )}

        {messages.map((m) => {
          const isUser = safeLower(m.role) === "user";
          return (
            <div
              key={m.chatId}
              className={["acp-bubble-row", "mb-3", "d-flex", isUser ? "is-user" : "is-ai"].join(" ")}
            >
              <div className={["acp-bubble", "shadow-sm", isUser ? "acp-bubble-user" : "acp-bubble-ai"].join(" ")}>
                {m.content}
                {m.createdAt && <div className="acp-bubble-time mt-2">{fmt(m.createdAt)}</div>}
              </div>
            </div>
          );
        })}

        {loadingMessages && <div className="text-center text-muted py-3">불러오는 중...</div>}
      </div>

      <div className="p-3 border-top text-muted small" />
    </div>
  );
}

// -----------------------------
// main
// -----------------------------
export default function AdminChatPage() {
  const PAGE_SIZE = 7; // ✅ 7개씩 페이지

  const navigate = useNavigate();

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

  const [error, setError] = useState("");

  const loadList = async (nextPage = page) => {
    setLoadingList(true);
    setError("");

    try {
      const params = {
        status: status || undefined,
        memberId: memberId.trim() ? Number(memberId.trim()) : undefined,
        q: q.trim() ? q.trim() : undefined,
        page: nextPage,
        size: PAGE_SIZE,
      };

      const res = await axiosInstance.get("/api/admin/chat/sessions", { params });
      const content = res.data?.content ?? [];

      setList(content);
      setPageInfo({
        page: res.data?.page ?? nextPage,
        size: res.data?.size ?? PAGE_SIZE,
        totalPages: res.data?.totalPages ?? 0,
        totalElements: res.data?.totalElements ?? 0,
      });

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

  useEffect(() => {
    setPage(0);
    loadList(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!activeSessionId) return;
    loadMessages(activeSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // topbar 제외한 바디 높이 고정
  const bodyHeight = useMemo(() => `calc(100vh - ${topBarH}px)`, [topBarH]);

  return (
    <div className="acp-page">
      <TopBar
        topBarRef={topBarRef}
        error={error}
        onRefresh={() => loadList(page)}
        onGoDashboard={() => navigate("/admin/dashboard")}
      />

      <div className="acp-body" style={{ height: bodyHeight }}>
        <div className="container py-3 acp-container acp-body-inner">
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
