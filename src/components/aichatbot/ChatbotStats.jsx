import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "../Tool";
import {
  RefreshCcw,
  Ban,
  CheckCircle2,
  Wand2,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import "./ChatbotStats.css";

export default function ChatbotStats() {
  const [tab, setTab] = useState("blocked"); // blocked | autoblock | chunkstats | feedbackstats
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // -----------------------
  // 차단 목록
  // -----------------------
  const [activeOnly, setActiveOnly] = useState(true);
  const [blockedList, setBlockedList] = useState([]);
  const [q, setQ] = useState("");

  const filteredBlockedList = useMemo(() => {
    if (!q.trim()) return blockedList;
    const needle = q.trim().toLowerCase();
    return blockedList.filter((x) => {
      const cid = String(x.chunkId ?? "");
      const rsn = String(x.reason ?? "").toLowerCase();
      return cid.includes(needle) || rsn.includes(needle);
    });
  }, [blockedList, q]);

  const loadBlocked = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await axiosInstance.get("/api/chat/rag/blocked-chunks", {
        params: { active: activeOnly },
      });
      setBlockedList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setBlockedList([]);
      setErr(`차단 목록 로드 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // 단건 차단
  const [blockChunkId, setBlockChunkId] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const onBlock = async () => {
    const cid = Number(blockChunkId);
    if (!cid || Number.isNaN(cid)) return alert("chunkId를 숫자로 입력하세요.");

    setBusy(true);
    setErr(null);
    try {
      await axiosInstance.post("/api/chat/rag/blocked-chunks", {
        chunkId: cid,
        reason: blockReason || null,
      });
      setBlockChunkId("");
      setBlockReason("");
      await loadBlocked();
    } catch (e) {
      setErr(`차단 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const onUnblock = async (chunkId) => {
    if (!window.confirm(`chunkId=${chunkId} 차단 해제할까요?`)) return;

    setBusy(true);
    setErr(null);
    try {
      await axiosInstance.post(`/api/chat/rag/blocked-chunks/unblock/${chunkId}`);
      await loadBlocked();
    } catch (e) {
      setErr(`해제 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // -----------------------
  // 자동 차단
  // -----------------------
  const [autoScope, setAutoScope] = useState("all"); // all | my
  const [autoDays, setAutoDays] = useState(30);
  const [autoTop, setAutoTop] = useState(20);
  const [autoBadN, setAutoBadN] = useState(3);
  const [autoReason, setAutoReason] = useState("");
  const [autoRes, setAutoRes] = useState(null);

  const runAutoBlock = async () => {
    setBusy(true);
    setErr(null);
    setAutoRes(null);

    try {
      const url =
        autoScope === "my"
          ? "/api/chat/rag/blocked-chunks/auto-block/my"
          : "/api/chat/rag/blocked-chunks/auto-block/all";

      const res = await axiosInstance.post(url, null, {
        params: { days: autoDays, top: autoTop, badN: autoBadN, reason: autoReason || undefined },
      });

      setAutoRes(res.data);
      await loadBlocked();
    } catch (e) {
      setErr(`자동 차단 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // -----------------------
  // chunk 통계
  // -----------------------
  const [statsScope, setStatsScope] = useState("all"); // all | my
  const [statsDays, setStatsDays] = useState(30);
  const [statsTop, setStatsTop] = useState(10);
  const [refStats, setRefStats] = useState(null);

  const loadRefStats = async () => {
    setBusy(true);
    setErr(null);
    try {
      const url = statsScope === "my" ? "/api/chat/refs/stats/my" : "/api/chat/refs/stats/all";
      const res = await axiosInstance.get(url, { params: { days: statsDays, top: statsTop } });
      setRefStats(res.data);
    } catch (e) {
      setRefStats(null);
      setErr(`refs 통계 로드 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // -----------------------
  // feedback 통계 (이번에 만든 백엔드)
  // -----------------------
  const [fbDays, setFbDays] = useState(30);
  const [fbTop, setFbTop] = useState(10);
  const [fbStats, setFbStats] = useState(null);

  const loadFeedbackStats = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await axiosInstance.get("/api/chat/feedback/stats", {
        params: { days: fbDays, top: fbTop },
      });
      setFbStats(res.data);
    } catch (e) {
      setFbStats(null);
      setErr(`피드백 통계 로드 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // 탭 진입 시 자동 로드
  useEffect(() => {
    if (tab === "blocked") loadBlocked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeOnly]);

  const refreshTab = async () => {
    if (tab === "blocked") return loadBlocked();
    if (tab === "chunkstats") return loadRefStats();
    if (tab === "feedbackstats") return loadFeedbackStats();
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="mb-0 fw-bold">챗봇 운영자 콘솔</h4>
          <div className="text-muted small">차단 관리 · 자동 차단 · 품질 통계 · 피드백 통계</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={refreshTab} disabled={busy}>
          <RefreshCcw size={16} className="me-2" />
          새로고침
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === "blocked" ? "active" : ""}`} onClick={() => setTab("blocked")}>
            <Ban size={16} className="me-2" /> 차단 관리
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "autoblock" ? "active" : ""}`} onClick={() => setTab("autoblock")}>
            <Wand2 size={16} className="me-2" /> 자동 차단
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "chunkstats" ? "active" : ""}`} onClick={() => setTab("chunkstats")}>
            <BarChart3 size={16} className="me-2" /> Chunk 통계
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "feedbackstats" ? "active" : ""}`} onClick={() => setTab("feedbackstats")}>
            <ThumbsUp size={16} className="me-2" /> 피드백 통계
          </button>
        </li>
      </ul>

      {/* ===========================
          TAB: 차단 관리
      =========================== */}
      {tab === "blocked" && (
        <div className="row g-3">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2 justify-content-between align-items-end mb-2">
                  <div>
                    <div className="btn-group">
                      <button
                        className={`btn btn-sm ${activeOnly ? "btn-danger" : "btn-outline-danger"}`}
                        onClick={() => setActiveOnly(true)}
                      >
                        활성
                      </button>
                      <button
                        className={`btn btn-sm ${!activeOnly ? "btn-secondary" : "btn-outline-secondary"}`}
                        onClick={() => setActiveOnly(false)}
                      >
                        해제됨
                      </button>
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <input
                      className="form-control form-control-sm"
                      style={{ width: 260 }}
                      placeholder="chunkId/사유 검색"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 80 }}>상태</th>
                        <th style={{ width: 110 }}>blockId</th>
                        <th style={{ width: 120 }}>chunkId</th>
                        <th>사유</th>
                        <th style={{ width: 160 }}>createdAt</th>
                        <th style={{ width: 110 }}>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBlockedList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">데이터 없음</td>
                        </tr>
                      ) : (
                        filteredBlockedList.map((r) => (
                          <tr key={r.blockId ?? `${r.chunkId}-${r.createdAt}`}>
                            <td>
                              {Number(r.isActive) === 1 ? (
                                <span className="badge text-bg-danger">차단</span>
                              ) : (
                                <span className="badge text-bg-secondary">해제</span>
                              )}
                            </td>
                            <td>{r.blockId ?? "-"}</td>
                            <td className="font-monospace">{r.chunkId}</td>
                            <td title={r.reason ?? ""}>{r.reason ?? "-"}</td>
                            <td className="text-muted">{String(r.createdAt ?? "-")}</td>
                            <td>
                              {Number(r.isActive) === 1 ? (
                                <button className="btn btn-sm btn-outline-success" onClick={() => onUnblock(r.chunkId)} disabled={busy}>
                                  <CheckCircle2 size={16} className="me-1" /> 해제
                                </button>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="alert alert-info mt-3 mb-0">
                  활성(차단)된 chunkId는 RAG 검색 결과에서 제외됩니다.
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-3">단건 차단</h6>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">chunkId</label>
                  <input className="form-control form-control-sm font-monospace"
                    value={blockChunkId}
                    onChange={(e) => setBlockChunkId(e.target.value)}
                    placeholder="예: 123"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted mb-1">사유(선택)</label>
                  <input className="form-control form-control-sm"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="예: 반복적으로 싫어요 발생"
                  />
                </div>

                <button className="btn btn-danger w-100" onClick={onBlock} disabled={busy}>
                  <Ban size={16} className="me-2" /> 차단 등록
                </button>

                <div className="text-muted small mt-2">
                  동일 chunkId는 Upsert(사유 갱신 + 활성화)로 처리됩니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===========================
          TAB: 자동 차단
      =========================== */}
      {tab === "autoblock" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h6 className="fw-bold mb-3">bad-chunks 기반 자동 차단</h6>

            <div className="d-flex flex-wrap gap-2 mb-3">
              <div className="btn-group">
                <button className={`btn btn-sm ${autoScope === "all" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setAutoScope("all")}>
                  ALL
                </button>
                <button className={`btn btn-sm ${autoScope === "my" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setAutoScope("my")}>
                  MY
                </button>
              </div>

              <div className="d-flex gap-2 align-items-center">
                <input type="number" className="form-control form-control-sm" style={{ width: 110 }}
                  value={autoDays} min={1} max={365}
                  onChange={(e) => setAutoDays(Number(e.target.value))}
                />
                <span className="text-muted small">days</span>
              </div>

              <div className="d-flex gap-2 align-items-center">
                <input type="number" className="form-control form-control-sm" style={{ width: 110 }}
                  value={autoTop} min={1} max={50}
                  onChange={(e) => setAutoTop(Number(e.target.value))}
                />
                <span className="text-muted small">top</span>
              </div>

              <div className="d-flex gap-2 align-items-center">
                <input type="number" className="form-control form-control-sm" style={{ width: 110 }}
                  value={autoBadN} min={1} max={20}
                  onChange={(e) => setAutoBadN(Number(e.target.value))}
                />
                <span className="text-muted small">badN</span>
              </div>

              <input className="form-control form-control-sm" style={{ minWidth: 260 }}
                placeholder="reason(선택)"
                value={autoReason}
                onChange={(e) => setAutoReason(e.target.value)}
              />

              <button className="btn btn-primary btn-sm" onClick={runAutoBlock} disabled={busy}>
                <Wand2 size={16} className="me-2" /> 실행
              </button>
            </div>

            {autoRes && (
              <div className="alert alert-success mb-0">
                후보 {autoRes.candidateCount}개 중 {autoRes.blockedCount}개 차단 처리됨
                <div className="small text-muted mt-1">reason: {autoRes.reason}</div>
              </div>
            )}

            {!autoRes && (
              <div className="alert alert-info mb-0">
                싫어요 많은 답변에서 반복 등장하는 chunkId를 찾아 자동 차단합니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===========================
          TAB: Chunk 통계
      =========================== */}
      {tab === "chunkstats" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">refs 통계</h6>

              <div className="d-flex flex-wrap gap-2">
                <div className="btn-group">
                  <button className={`btn btn-sm ${statsScope === "all" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setStatsScope("all")}>
                    ALL
                  </button>
                  <button className={`btn btn-sm ${statsScope === "my" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setStatsScope("my")}>
                    MY
                  </button>
                </div>

                <input type="number" className="form-control form-control-sm" style={{ width: 110 }}
                  value={statsDays} min={1} max={365}
                  onChange={(e) => setStatsDays(Number(e.target.value))}
                />
                <input type="number" className="form-control form-control-sm" style={{ width: 110 }}
                  value={statsTop} min={1} max={50}
                  onChange={(e) => setStatsTop(Number(e.target.value))}
                />

                <button className="btn btn-outline-secondary btn-sm" onClick={loadRefStats} disabled={busy}>
                  <RefreshCcw size={16} className="me-2" /> 조회
                </button>
              </div>
            </div>

            {!refStats ? (
              <div className="alert alert-info mb-0">조회 버튼을 눌러 통계를 불러오세요.</div>
            ) : (
              <>
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small">totalRefs</div>
                      <div className="fw-bold">{refStats.totalRefs ?? 0}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small">avgScore</div>
                      <div className="fw-bold">{refStats.avgScore == null ? "-" : Number(refStats.avgScore).toFixed(4)}</div>
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 160 }}>chunkId</th>
                        <th style={{ width: 120 }}>count</th>
                        <th style={{ width: 140 }}>avgScore</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(refStats.topChunks ?? []).length === 0 ? (
                        <tr><td colSpan={3} className="text-center text-muted py-4">데이터 없음</td></tr>
                      ) : (
                        (refStats.topChunks ?? []).map((r) => (
                          <tr key={r.chunkId}>
                            <td className="font-monospace">{r.chunkId}</td>
                            <td>{r.count}</td>
                            <td>{r.avgScore == null ? "-" : Number(r.avgScore).toFixed(4)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===========================
          TAB: 피드백 통계
      =========================== */}
      {tab === "feedbackstats" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">좋아요/싫어요 통계</h6>

              <div className="d-flex flex-wrap gap-2">
                <input type="number" className="form-control form-control-sm" style={{ width: 110 }}
                  value={fbDays} min={1} max={365}
                  onChange={(e) => setFbDays(Number(e.target.value))}
                />
                <input type="number" className="form-control form-control-sm" style={{ width: 110 }}
                  value={fbTop} min={1} max={50}
                  onChange={(e) => setFbTop(Number(e.target.value))}
                />

                <button className="btn btn-outline-secondary btn-sm" onClick={loadFeedbackStats} disabled={busy}>
                  <RefreshCcw size={16} className="me-2" /> 조회
                </button>
              </div>
            </div>

            {!fbStats ? (
              <div className="alert alert-info mb-0">
                조회 버튼을 눌러 통계를 불러오세요. (API: <span className="font-monospace">GET /api/chat/feedback/stats</span>)
              </div>
            ) : (
              <>
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small"><ThumbsUp size={14} className="me-1" /> 총 좋아요 </div>
                      <div className="fw-bold">{fbStats.totalLikes ?? 0}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small"><ThumbsDown size={14} className="me-1" /> 총 싫어요 </div>
                      <div className="fw-bold">{fbStats.totalDislikes ?? 0}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small"> 총점 </div>
                      <div className="fw-bold">{fbStats.net ?? 0}</div>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-lg-6">
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>model</th>
                            <th style={{ width: 90 }}>좋아요</th>
                            <th style={{ width: 100 }}>싫어요</th>
                            <th style={{ width: 80 }}>총점</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(fbStats.byModel ?? []).length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-muted py-4">데이터 없음</td></tr>
                          ) : (
                            (fbStats.byModel ?? []).map((r, i) => (
                              <tr key={`${r.model ?? "UNKNOWN"}-${i}`}>
                                <td className="font-monospace">{r.model ?? "UNKNOWN"}</td>
                                <td>{r.likes ?? 0}</td>
                                <td>{r.dislikes ?? 0}</td>
                                <td>{r.net ?? ((r.likes ?? 0) - (r.dislikes ?? 0))}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>chatId</th>
                            <th>모델 버전</th>
                            <th style={{ width: 100 }}>싫어요</th>
                            <th style={{ width: 80 }}>총점</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(fbStats.topDislikedMessages ?? []).length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-muted py-4">데이터 없음</td></tr>
                          ) : (
                            (fbStats.topDislikedMessages ?? []).map((r) => (
                              <tr key={r.chatId}>
                                <td className="font-monospace">{r.chatId}</td>
                                <td className="font-monospace">{r.model}</td>
                                <td className="text-danger fw-bold">{r.dislikes}</td>
                                <td>{r.net}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="alert alert-info mb-0">
                      총점은 좋아요 - 싫어요 값입니다. <br />
                      값이 낮을수록 사용자 만족도가 낮은 답변/모델입니다.
                      {/* 이 “topDisliked chatId”는 곧바로 <span className="font-monospace">/api/chat/messages/{`{chatId}`}/refs</span> 로
                      근거 chunk를 조회해서 “어떤 chunk가 문제인지”까지 추적할 수 있어요. */}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
