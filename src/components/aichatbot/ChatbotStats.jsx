// src/components/aichatbot/ChatbotStats.jsx
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
  Cpu,
} from "lucide-react";
import "./ChatbotStats.css";

export default function ChatbotStats() {
  const [tab, setTab] = useState("feedbackstats"); // blocked | autoblock | chunkstats | feedbackstats | usagestats
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
      setErr(`차단 목록 불러오기 실패: ${e?.message ?? e}`);
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
      setErr(`차단 등록 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const onUnblock = async (chunkId) => {
    if (!window.confirm(`chunkId=${chunkId} 차단을 해제할까요?`)) return;

    setBusy(true);
    setErr(null);
    try {
      await axiosInstance.post(`/api/chat/rag/blocked-chunks/unblock/${chunkId}`);
      await loadBlocked();
    } catch (e) {
      setErr(`차단 해제 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // -----------------------
  // 자동 차단
  // -----------------------
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
      const url = "/api/chat/rag/blocked-chunks/auto-block/all";

      const res = await axiosInstance.post(url, null, {
        params: {
          days: autoDays,
          top: autoTop,
          badN: autoBadN,
          reason: autoReason || undefined,
        },
      });

      setAutoRes(res.data);
      await loadBlocked();
    } catch (e) {
      setErr(`자동 차단 실행 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // -----------------------
  // Chunk(근거) 품질 통계
  // -----------------------
  const [statsDays, setStatsDays] = useState(30);
  const [statsTop, setStatsTop] = useState(10);
  const [refStats, setRefStats] = useState(null);

  const loadRefStats = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await axiosInstance.get("/api/chat/refs/stats/all", {
        params: { days: statsDays, top: statsTop },
      });
      setRefStats(res.data);
    } catch (e) {
      setRefStats(null);
      setErr(`근거(Chunk) 통계 불러오기 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // -----------------------
  // 피드백 통계 (좋아요/싫어요)
  // -----------------------
  const [fbDays, setFbDays] = useState(30);
  const [fbTop, setFbTop] = useState(10);
  const [fbStats, setFbStats] = useState(null);

  const loadFeedbackStats = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await axiosInstance.get("/api/admin/stats/feedback", {
        params: { days: fbDays, top: fbTop },
      });
      setFbStats(res.data);
    } catch (e) {
      setFbStats(null);
      setErr(`피드백 통계 불러오기 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  // -----------------------
  // ✅ 토큰/지연 통계
  // -----------------------
  const [usageDays, setUsageDays] = useState(30);
  const [usageStats, setUsageStats] = useState(null);

  const loadUsageStats = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await axiosInstance.get("/api/admin/stats/usage", {
        params: { days: usageDays },
      });
      setUsageStats(res.data);
    } catch (e) {
      setUsageStats(null);
      setErr(
        `토큰 통계 불러오기 실패: ${
          e?.response?.status === 404
            ? "API가 아직 없습니다. (GET /api/admin/stats/usage)"
            : e?.message ?? e
        }`
      );
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
    if (tab === "usagestats") return loadUsageStats();
  };

  // 숫자 표시 유틸
  const fmtInt = (v) => (v == null ? 0 : Number(v).toLocaleString());
  const fmtFloat = (v, d = 1) => (v == null ? "-" : Number(v).toFixed(d));
  const fmtScore = (v) => (v == null ? "-" : Number(v).toFixed(4));

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="mb-0 fw-bold">챗봇 운영자 콘솔</h4>
          <div className="text-muted small">
            피드백 통계 · 토큰 통계 · 차단 관리 · 자동 차단 · 근거(Chunk) 품질 통계
          </div>
        </div>
        <button className="btn btn-outline-secondary" onClick={refreshTab} disabled={busy}>
          <RefreshCcw size={16} className="me-2" />
          현재 탭 새로고침
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "feedbackstats" ? "active" : ""}`}
            onClick={() => setTab("feedbackstats")}
          >
            <ThumbsUp size={16} className="me-2" /> 피드백 통계(좋아요/싫어요)
          </button>
        </li>

        {/* ✅ NEW: 토큰 통계 탭 */}
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "usagestats" ? "active" : ""}`}
            onClick={() => setTab("usagestats")}
          >
            <Cpu size={16} className="me-2" /> 토큰 통계(비용/지연)
          </button>
        </li>

        <li className="nav-item">
          <button
            className={`nav-link ${tab === "blocked" ? "active" : ""}`}
            onClick={() => setTab("blocked")}
          >
            <Ban size={16} className="me-2" /> 차단 관리
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "autoblock" ? "active" : ""}`}
            onClick={() => setTab("autoblock")}
          >
            <Wand2 size={16} className="me-2" /> 자동 차단(나쁜 답변 기반)
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "chunkstats" ? "active" : ""}`}
            onClick={() => setTab("chunkstats")}
          >
            <BarChart3 size={16} className="me-2" /> 근거(Chunk) 품질 통계
          </button>
        </li>
      </ul>

      {/* ===========================
          TAB: 토큰 통계
      =========================== */}
      {tab === "usagestats" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold mb-1">토큰/지연 요약</h6>
                <div className="text-muted small">
                  기간 내 총 토큰/평균 토큰/평균 지연, 모델별 분포를 확인합니다.
                </div>
                <div className="text-muted small mt-1">
                  API: <span className="font-monospace">GET /api/admin/stats/usage?days=30</span>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="d-flex gap-2 align-items-center">
                  <span className="text-muted small">기간(일)</span>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ width: 110 }}
                    value={usageDays}
                    min={1}
                    max={365}
                    onChange={(e) => setUsageDays(Number(e.target.value))}
                  />
                </div>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={loadUsageStats}
                  disabled={busy}
                >
                  <RefreshCcw size={16} className="me-2" /> 조회
                </button>
              </div>
            </div>

            {!usageStats ? (
              <div className="alert alert-info mb-0">
                <div className="fw-bold mb-1">통계가 아직 없습니다.</div>
                조회 버튼을 눌러 토큰 통계를 불러오세요.
                <div className="text-muted small mt-2">
                  (백엔드 미구현이면 404가 뜹니다. 컨트롤러 1개만 추가하면 바로 연결돼요.)
                </div>
              </div>
            ) : (
              <>
                <div className="row g-2 mb-3">
                  <div className="col-md-3">
                    <div className="border rounded p-2">
                      <div className="text-muted small">총 요청 수</div>
                      <div className="fw-bold">{fmtInt(usageStats.totalRequests)}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="border rounded p-2">
                      <div className="text-muted small">총 토큰</div>
                      <div className="fw-bold">{fmtInt(usageStats.totalTokens)}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="border rounded p-2">
                      <div className="text-muted small">평균 토큰</div>
                      <div className="fw-bold">{fmtFloat(usageStats.avgTokens, 1)}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="border rounded p-2">
                      <div className="text-muted small">평균 지연(ms)</div>
                      <div className="fw-bold">{fmtFloat(usageStats.avgLatencyMs, 0)}</div>
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="fw-bold">모델별 토큰/지연</div>
                  <div className="text-muted small">비용/성능 비교</div>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>모델</th>
                        <th style={{ width: 120 }}>요청 수</th>
                        <th style={{ width: 140 }}>총 토큰</th>
                        <th style={{ width: 140 }}>평균 토큰</th>
                        <th style={{ width: 140 }}>평균 지연(ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(usageStats.byModel ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-4">
                            데이터 없음
                          </td>
                        </tr>
                      ) : (
                        (usageStats.byModel ?? []).map((r, i) => (
                          <tr key={`${r.model ?? "UNKNOWN"}-${i}`}>
                            <td className="font-monospace">{r.model ?? "UNKNOWN"}</td>
                            <td>{fmtInt(r.requests)}</td>
                            <td>{fmtInt(r.tokens)}</td>
                            <td>{fmtFloat(r.avgTokens, 1)}</td>
                            <td>{fmtFloat(r.avgLatencyMs, 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="alert alert-info mb-0 mt-3">
                  <div className="fw-bold mb-1">해석 팁</div>
                  <ul className="mb-0">
                    <li>
                      <b>총 토큰</b>이 많을수록 비용이 증가합니다.
                    </li>
                    <li>
                      <b>평균 지연</b>이 높은 모델/프롬프트는 UX에 영향이 큽니다.
                    </li>
                    {/* <li>나중에 원하면 “세션/회원별 토큰”까지 drill-down도 쉽게 확장됩니다.</li> */}
                  </ul>
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
              <div>
                <h6 className="fw-bold mb-1">좋아요/싫어요 요약</h6>
                <div className="text-muted small">
                  기간 내 전체 반응 및 모델별 성능, 싫어요가 많은 메시지를 확인합니다.
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="d-flex gap-2 align-items-center">
                  <span className="text-muted small">기간(일)</span>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ width: 110 }}
                    value={fbDays}
                    min={1}
                    max={365}
                    onChange={(e) => setFbDays(Number(e.target.value))}
                  />
                </div>

                <div className="d-flex gap-2 align-items-center">
                  <span className="text-muted small">상위 N</span>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ width: 110 }}
                    value={fbTop}
                    min={1}
                    max={50}
                    onChange={(e) => setFbTop(Number(e.target.value))}
                  />
                </div>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={loadFeedbackStats}
                  disabled={busy}
                >
                  <RefreshCcw size={16} className="me-2" /> 조회
                </button>
              </div>
            </div>

            {!fbStats ? (
              <div className="alert alert-info mb-0">
                <div className="fw-bold mb-1">통계가 아직 없습니다.</div>
                조회 버튼을 눌러 통계를 불러오세요.
                <div className="text-muted small mt-2">
                  API: <span className="font-monospace">GET /api/admin/stats/feedback</span>
                </div>
              </div>
            ) : (
              <>
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small">
                        <ThumbsUp size={14} className="me-1" /> 총 좋아요
                      </div>
                      <div className="fw-bold">{fmtInt(fbStats.totalLikes)}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small">
                        <ThumbsDown size={14} className="me-1" /> 총 싫어요
                      </div>
                      <div className="fw-bold">{fmtInt(fbStats.totalDislikes)}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small">순점수(좋아요-싫어요)</div>
                      <div className="fw-bold">{fmtInt(fbStats.net)}</div>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-lg-6">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="fw-bold">모델별 반응</div>
                      <div className="text-muted small">모델 품질 비교용</div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>모델</th>
                            <th style={{ width: 90 }}>좋아요</th>
                            <th style={{ width: 100 }}>싫어요</th>
                            <th style={{ width: 90 }}>순점수</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(fbStats.byModel ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted py-4">
                                데이터 없음
                              </td>
                            </tr>
                          ) : (
                            (fbStats.byModel ?? []).map((r, i) => {
                              const likes = r.likes ?? 0;
                              const dislikes = r.dislikes ?? 0;
                              const net = r.net ?? likes - dislikes;
                              return (
                                <tr key={`${r.model ?? "UNKNOWN"}-${i}`}>
                                  <td className="font-monospace">{r.model ?? "UNKNOWN"}</td>
                                  <td>{fmtInt(likes)}</td>
                                  <td>{fmtInt(dislikes)}</td>
                                  <td className={net < 0 ? "text-danger fw-bold" : ""}>
                                    {fmtInt(net)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="fw-bold">싫어요 많은 답변 TOP</div>
                      <div className="text-muted small">문제 답변 추적용</div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>chatId</th>
                            <th>모델</th>
                            <th style={{ width: 90 }}>싫어요</th>
                            <th style={{ width: 90 }}>순점수</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(fbStats.topDislikedMessages ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted py-4">
                                데이터 없음
                              </td>
                            </tr>
                          ) : (
                            (fbStats.topDislikedMessages ?? []).map((r) => (
                              <tr key={r.chatId}>
                                <td className="font-monospace">{r.chatId}</td>
                                <td className="font-monospace">{r.model ?? "-"}</td>
                                <td className="text-danger fw-bold">{fmtInt(r.dislikes)}</td>
                                <td>{fmtInt(r.net)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="alert alert-info mb-0">
                      <div className="fw-bold mb-1">해석 팁</div>
                      <div>
                        순점수는 <b>좋아요 - 싫어요</b>입니다. 값이 낮을수록 사용자 만족도가 낮은
                        답변/모델입니다.
                      </div>
                      <div className="text-muted small mt-2">
                        (추적 확장) top chatId로 근거(chunk)를 조회해서 “어떤 문서 조각이 문제인지”까지
                        추적할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                        활성(차단중)
                      </button>
                      <button
                        className={`btn btn-sm ${
                          !activeOnly ? "btn-secondary" : "btn-outline-secondary"
                        }`}
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
                      placeholder="chunkId 또는 사유 검색"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 90 }}>상태</th>
                        <th style={{ width: 110 }}>blockId</th>
                        <th style={{ width: 120 }}>chunkId</th>
                        <th>사유</th>
                        <th style={{ width: 170 }}>등록일</th>
                        <th style={{ width: 120 }}>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBlockedList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            데이터 없음
                          </td>
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
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => onUnblock(r.chunkId)}
                                  disabled={busy}
                                >
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
                  <div className="fw-bold mb-1">안내</div>
                  활성(차단)된 chunkId는 RAG 검색 결과에서 제외됩니다.
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-3">단건 차단 등록</h6>

                <div className="mb-2">
                  <label className="form-label small text-muted mb-1">chunkId</label>
                  <input
                    className="form-control form-control-sm font-monospace"
                    value={blockChunkId}
                    onChange={(e) => setBlockChunkId(e.target.value)}
                    placeholder="예: 123"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small text-muted mb-1">사유(선택)</label>
                  <input
                    className="form-control form-control-sm"
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
            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2">
              <div>
                <h6 className="fw-bold mb-1">나쁜 답변 기반 자동 차단</h6>
                <div className="text-muted small">
                  싫어요가 많은 답변에서 반복 등장하는 chunkId를 찾아 자동으로 차단합니다.
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              <div className="d-flex gap-2 align-items-center">
                <span className="text-muted small">기간(일)</span>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 110 }}
                  value={autoDays}
                  min={1}
                  max={365}
                  onChange={(e) => setAutoDays(Number(e.target.value))}
                />
              </div>

              <div className="d-flex gap-2 align-items-center">
                <span className="text-muted small">상위 N</span>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 110 }}
                  value={autoTop}
                  min={1}
                  max={50}
                  onChange={(e) => setAutoTop(Number(e.target.value))}
                />
              </div>

              <div className="d-flex gap-2 align-items-center">
                <span className="text-muted small">나쁜 기준(싫어요 ≥)</span>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 130 }}
                  value={autoBadN}
                  min={1}
                  max={20}
                  onChange={(e) => setAutoBadN(Number(e.target.value))}
                />
              </div>

              <input
                className="form-control form-control-sm"
                style={{ minWidth: 260 }}
                placeholder="차단 사유(선택)"
                value={autoReason}
                onChange={(e) => setAutoReason(e.target.value)}
              />

              <button className="btn btn-primary btn-sm" onClick={runAutoBlock} disabled={busy}>
                <Wand2 size={16} className="me-2" /> 실행
              </button>
            </div>

            {autoRes ? (
              <div className="alert alert-success mb-0">
                <div className="fw-bold">
                  후보 {fmtInt(autoRes.candidateCount)}개 중 {fmtInt(autoRes.blockedCount)}개 차단 처리 완료
                </div>
                <div className="small text-muted mt-1">사유: {autoRes.reason}</div>
              </div>
            ) : (
              <div className="alert alert-info mb-0">
                <div className="fw-bold mb-1">안내</div>
                “나쁜 답변(싫어요 기준)”에 자주 등장하는 chunkId를 찾아 자동 차단합니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===========================
          TAB: 근거(Chunk) 품질 통계
      =========================== */}
      {tab === "chunkstats" && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold mb-1">근거(Chunk) 품질 통계</h6>
                <div className="text-muted small">
                  어떤 chunk가 자주 참조되는지, 유사도(점수)가 어떤지, 싫어요와 함께 문제가 되는지 확인합니다.
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 align-items-center">
                <div className="d-flex gap-2 align-items-center">
                  <span className="text-muted small">기간(일)</span>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ width: 110 }}
                    value={statsDays}
                    min={1}
                    max={365}
                    onChange={(e) => setStatsDays(Number(e.target.value))}
                  />
                </div>

                <div className="d-flex gap-2 align-items-center">
                  <span className="text-muted small">상위 N</span>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ width: 110 }}
                    value={statsTop}
                    min={1}
                    max={50}
                    onChange={(e) => setStatsTop(Number(e.target.value))}
                  />
                </div>

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
                      <div className="text-muted small">총 근거 참조 수</div>
                      <div className="fw-bold">{fmtInt(refStats.totalRefs)}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small">평균 유사도 점수</div>
                      <div className="fw-bold">{fmtScore(refStats.avgScore)}</div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="border rounded p-2">
                      <div className="text-muted small">조회 범위</div>
                      <div className="fw-bold">
                        {refStats.scope === "MY" ? "내 데이터" : "전체"} · 최근 {fmtInt(refStats.days)}일
                      </div>
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 140 }}>chunkId</th>
                        <th style={{ width: 120 }}>참조 횟수</th>
                        <th style={{ width: 140 }}>평균 점수</th>
                        <th style={{ width: 140 }}>싫어요 합계</th>
                        <th style={{ width: 140 }}>나쁜 답변 수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(refStats.topChunks ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-4">
                            데이터 없음
                          </td>
                        </tr>
                      ) : (
                        (refStats.topChunks ?? []).map((r) => (
                          <tr key={r.chunkId}>
                            <td className="font-monospace">{r.chunkId}</td>
                            <td>{fmtInt(r.count)}</td>
                            <td>{fmtScore(r.avgScore)}</td>
                            <td className={Number(r.sumDislikes ?? 0) > 0 ? "text-danger fw-bold" : ""}>
                              {fmtInt(r.sumDislikes ?? 0)}
                            </td>
                            <td className={Number(r.badAnswerCount ?? 0) > 0 ? "text-danger fw-bold" : ""}>
                              {fmtInt(r.badAnswerCount ?? 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="alert alert-info mt-3 mb-0">
                  <div className="fw-bold mb-1">해석 팁</div>
                  <ul className="mb-0">
                    <li>
                      <b>참조 횟수</b>: 답변 생성 시 해당 chunk가 근거로 선택된 횟수
                    </li>
                    <li>
                      <b>평균 점수</b>: 검색 유사도(높을수록 질문과 더 관련)
                    </li>
                    <li>
                      <b>싫어요 합계 / 나쁜 답변 수</b>: “이 chunk를 쓴 답변들이 얼마나 불만을 받았는지” 추적 지표
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
