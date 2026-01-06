import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Tool";
import { Search, Trash2, RefreshCcw, RotateCcw, ShieldAlert, MessageSquareText } from "lucide-react";

const safeLower = (v) => String(v ?? "").toLowerCase();
const fmt = (iso) => {
  try { return new Date(iso).toLocaleString(); } catch { return iso ?? ""; }
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
      <mark key={i} style={{ background: "rgba(250,204,21,0.6)", padding: "0 2px", borderRadius: 4 }}>
        {p}
      </mark>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
};

export default function AdminChatPage() {
  const [status, setStatus] = useState("ACTIVE");
  const [memberId, setMemberId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const [loadingList, setLoadingList] = useState(false);
  const [list, setList] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, size: 20, totalPages: 0, totalElements: 0 });

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
        size: 20,
      };

      const res = await axiosInstance.get("/api/admin/chat/sessions", { params });
      setList(res.data?.content ?? []);
      setPageInfo({
        page: res.data?.page ?? nextPage,
        size: res.data?.size ?? 20,
        totalPages: res.data?.totalPages ?? 0,
        totalElements: res.data?.totalElements ?? 0,
      });

      // 첫 항목 자동 선택
      const first = (res.data?.content ?? [])?.[0];
      if (first?.sessionId && activeSessionId == null) {
        setActiveSessionId(first.sessionId);
      }
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
    loadList(0);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (!activeSessionId) return;
    loadMessages(activeSessionId);
  }, [activeSessionId]);

  const runSearch = () => {
    setPage(0);
    loadList(0);
  };

  const softDelete = async (sid) => {
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

  const restore = async (sid) => {
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

  const hardDelete = async (sid) => {
    const ok = window.confirm(`⚠️ 세션 #${sid}를 영구삭제(하드삭제)할까요?\n메시지도 함께 삭제됩니다.`);
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
      alert("하드삭제 실패(서버/권한 확인)");
    }
  };

  const totalPages = pageInfo.totalPages ?? 0;

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div className="container py-4" style={{ maxWidth: 1300 }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="fw-bold d-flex align-items-center gap-2" style={{ color: "#0f172a" }}>
            <ShieldAlert /> 관리자 · 세션 관리
          </div>
          <button className="btn btn-outline-secondary" onClick={() => loadList(page)}>
            <RefreshCcw size={16} className="me-2" />
            새로고침
          </button>
        </div>

        {error && <div className="alert alert-warning" style={{ borderRadius: 12 }}>{error}</div>}

        <div className="row g-3">
          {/* LEFT: list */}
          <div className="col-12 col-lg-4">
            <div className="bg-white border rounded-4 shadow-sm overflow-hidden">
              {/* filters */}
              <div className="p-3 border-bottom">
                <div className="d-flex gap-2 align-items-center mb-2">
                  <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DELETED">DELETED</option>
                    <option value="">ALL</option>
                  </select>
                  <input
                    className="form-control"
                    placeholder="memberId"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    style={{ maxWidth: 120 }}
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
                    onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                  />
                  <button className="btn btn-success" onClick={runSearch} disabled={loadingList}>
                    검색
                  </button>
                </div>

                <div className="small text-muted mt-2">
                  {loadingList ? "불러오는 중..." : `총 ${pageInfo.totalElements}건 · ${page + 1}/${Math.max(1,totalPages)}`}
                </div>
              </div>

              {/* list */}
              <div style={{ maxHeight: "72vh", overflowY: "auto" }}>
                {list.length === 0 && (
                  <div className="p-4 text-center text-muted">세션이 없습니다.</div>
                )}

                {list.map((s) => {
                  const sid = s.sessionId;
                  const active = String(sid) === String(activeSessionId);

                  // ✅ 메시지 수 표시 (없으면 0)
                  const messageCount = Number(s.messageCount ?? 0);

                  return (
                    <div
                      key={sid}
                      className="p-3 border-bottom"
                      style={{ cursor: "pointer", background: active ? "#ecfdf5" : "white" }}
                      onClick={() => setActiveSessionId(sid)}
                    >
                      <div className="d-flex justify-content-between gap-2">
                        <div style={{ minWidth: 0 }}>
                          {/* ✅ 1줄 요약 + 메시지수 배지 */}
                          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                            <div
                              className="fw-semibold"
                              style={{
                                fontSize: 14,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                minWidth: 0,
                              }}
                            >
                              #{sid} · member {s.memberId} · {s.status}
                            </div>

                            <span
                              className="badge"
                              style={{
                                background: "#0ea5e9",
                                color: "white",
                                fontSize: 12,
                                borderRadius: 999,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 10px",
                                flex: "0 0 auto",
                              }}
                              title="메시지 개수"
                            >
                              <MessageSquareText size={14} />
                              {messageCount}
                            </span>
                          </div>

                          <div style={{ fontSize: 13 }}>
                            {renderHighlightedText(s.title || "새 대화", q)}
                          </div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            last: {s.lastMessageAt ? fmt(s.lastMessageAt) : "-"}
                          </div>
                        </div>

                        <div className="d-flex gap-1">
                          {s.status !== "DELETED" ? (
                            <button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); softDelete(sid); }}>
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-outline-secondary" onClick={(e) => { e.stopPropagation(); restore(sid); }}>
                              <RotateCcw size={16} />
                            </button>
                          )}

                          <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); hardDelete(sid); }}>
                            HARD
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* pagination */}
              <div className="p-3 d-flex justify-content-between align-items-center">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 0 || loadingList}
                  onClick={() => { const np = page - 1; setPage(np); loadList(np); }}
                >
                  이전
                </button>
                <div className="small text-muted">
                  page {page + 1} / {Math.max(1, totalPages)}
                </div>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page + 1 >= totalPages || loadingList}
                  onClick={() => { const np = page + 1; setPage(np); loadList(np); }}
                >
                  다음
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: session messages */}
          <div className="col-12 col-lg-8">
            <div className="bg-white border rounded-4 shadow-sm overflow-hidden" style={{ height: "84vh", display: "flex", flexDirection: "column" }}>
              <div className="p-3 border-bottom d-flex justify-content-between">
                <div>
                  <div className="fw-bold">세션 상세</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {activeSessionId ? `세션 #${activeSessionId}` : "왼쪽에서 세션을 선택하세요"}
                  </div>
                </div>
                <div className="text-muted small">{loadingMessages ? "불러오는 중..." : ""}</div>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#f8fafc" }} className="p-3">
                {!activeSessionId && <div className="text-center text-muted p-4">세션을 선택하면 메시지가 보입니다.</div>}

                {activeSessionId && messages.length === 0 && !loadingMessages && (
                  <div className="text-center text-muted p-4">메시지가 없습니다.</div>
                )}

                {messages.map((m) => {
                  const isUser = safeLower(m.role) === "user";
                  return (
                    <div key={m.chatId} className="mb-3 d-flex" style={{ justifyContent: isUser ? "flex-end" : "flex-start" }}>
                      <div
                        style={{
                          maxWidth: "82%",
                          padding: "12px 14px",
                          borderRadius: 18,
                          background: isUser ? "#059669" : "white",
                          color: isUser ? "white" : "#0f172a",
                          whiteSpace: "pre-wrap",
                          border: isUser ? "none" : "1px solid #eef2f7",
                          overflowWrap: "anywhere"
                        }}
                      >
                        {m.content}
                        {m.createdAt && <div className="mt-2" style={{ fontSize: 11, opacity: 0.75 }}>{fmt(m.createdAt)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-top text-muted small">
                {/* Tip: 관리자 페이지에서는 “title 검색” 외에 “메시지 내용 검색” 기능도 추가 가능(원하면 붙여줄게). */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
