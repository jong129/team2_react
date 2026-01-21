// src/components/aichatbot/ChatbotStats.jsx
import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Ban, CheckCircle2, Wand2, BarChart3, ThumbsUp, ThumbsDown, Cpu, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import "./ChatbotStats.css";

export default function ChatbotStats() {
  const navigate = useNavigate();

  // tab : 현재 탭 (feedbackstats | usagestats | blocked | autoblock | chunkstats)
  const [tab, setTab] = useState("feedbackstats");
  // busy, err : API 호출 중/에러 표시 
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // -----------------------
  // 차단 목록 탭 (blocked)
  // -----------------------
  const [activeOnly, setActiveOnly] = useState(true); // 활성 차단만 볼지 / 해제된 것도 볼지
  const [blockedList, setBlockedList] = useState([]); // 서버에서 받아온 차단 리스트
  const [q, setQ] = useState(""); // chunkId / 사유 검색어

  const filteredBlockedList = useMemo(() => { // blockedList를 q로 필터링한 결과(useMemo)
    if (!q.trim()) return blockedList;
    const needle = q.trim().toLowerCase();
    return blockedList.filter((x) => {
      const cid = String(x.chunkId ?? "");
      const rsn = String(x.reason ?? "").toLowerCase();
      return cid.includes(needle) || rsn.includes(needle);
    });
  }, [blockedList, q]);

  // /api/chat/rag/blocked-chunks?active=true|false GET : 목록 조회
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

  const [blockChunkId, setBlockChunkId] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // /api/chat/rag/blocked-chunks POST : 단건 차단 등록(upsert)
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

  // /api/chat/rag/blocked-chunks/unblock/{chunkId} POST : 차단 해제
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
  // 자동 차단 탭(autoblock)
  // -----------------------
  // 자동 차단 조건
  const [autoDays, setAutoDays] = useState(30);
  const [autoTop, setAutoTop] = useState(20);
  const [autoBadN, setAutoBadN] = useState(3);
  const [autoReason, setAutoReason] = useState("");
  // 실행 결과 (후보/차단된 개수 등)
  const [autoRes, setAutoRes] = useState(null);

  // /api/chat/rag/blocked-chunks/auto-block/all?days=&top=&badN=&reason= POST : 자동 차단 실행
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
  // 근거 통계 탭 (chunkstats)
  // -----------------------
  const [statsDays, setStatsDays] = useState(30);
  const [statsTop, setStatsTop] = useState(10);
  const [refStats, setRefStats] = useState(null);

  // /api/chat/refs/stats/all?days=&top= GET : top chunk, 평균 점수 등
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
  // 피드백 통계 탭 (feedbackstats)
  // -----------------------
  const [fbDays, setFbDays] = useState(30);
  const [fbTop, setFbTop] = useState(10);
  const [fbStats, setFbStats] = useState(null);

  // /api/admin/stats/feedback?days=&top= GET : 모델별 좋아요/싫어요, 싫어요 TOP 메시지
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
  // 토큰/지연 통계 탭 (usagestats)
  // -----------------------
  const [usageDays, setUsageDays] = useState(30);
  const [usageStats, setUsageStats] = useState(null);

  // /api/admin/stats/usage?days= GET : 없으면 404 처리 
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
        `토큰 통계 불러오기 실패: ${e?.response?.status === 404
          ? "API가 아직 없습니다. (GET /api/admin/stats/usage)"
          : e?.message ?? e
        }`
      );
    } finally {
      setBusy(false);
    }
  };

  // 탭 진입 시 자동 로드(차단 관리만)
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
    <div className="cbs-page">
      <div className="cbs-container">
        {/* Top */}
        <div className="cbs-top">
          <div>
            <div className="cbs-title">챗봇 운영자 콘솔</div>
            <div className="cbs-subtitle">
              피드백 통계 · 토큰 통계 · 차단 관리 · 자동 차단 · 근거(Chunk) 품질 통계
            </div>
          </div>

          <div className="cbs-top-actions">
            <button
              className="cbs-btn cbs-btn--outline"
              onClick={() => navigate("/admin/dashboard")}
              title="관리자 대시보드로"
            >
              <ArrowLeft size={16} />
              대시보드
            </button>

            <button className="cbs-btn cbs-btn--outline" onClick={refreshTab} disabled={busy}>
              <RefreshCcw size={16} className={busy ? "cbs-spin" : ""} />
              현재 탭 새로고침
            </button>
          </div>
        </div>

        {err && <div className="cbs-alert cbs-alert--danger">{err}</div>}

        {/* Tabs */}
        <div className="cbs-tabs">
          <button className={`cbs-tab ${tab === "feedbackstats" ? "is-active" : ""}`} onClick={() => setTab("feedbackstats")}>
            <ThumbsUp size={16} /> 피드백 통계
          </button>

          <button className={`cbs-tab ${tab === "usagestats" ? "is-active" : ""}`} onClick={() => setTab("usagestats")}>
            <Cpu size={16} /> 토큰 통계
          </button>

          <button className={`cbs-tab ${tab === "blocked" ? "is-active" : ""}`} onClick={() => setTab("blocked")}>
            <Ban size={16} /> 차단 관리
          </button>

          <button className={`cbs-tab ${tab === "autoblock" ? "is-active" : ""}`} onClick={() => setTab("autoblock")}>
            <Wand2 size={16} /> 자동 차단
          </button>

          <button className={`cbs-tab ${tab === "chunkstats" ? "is-active" : ""}`} onClick={() => setTab("chunkstats")}>
            <BarChart3 size={16} /> 근거 품질 통계
          </button>
        </div>

        {/* ===========================
            TAB: 토큰 통계
        =========================== */}
        {tab === "usagestats" && (
          <div className="cbs-panel">
            <div className="cbs-panel__top">
              <div>
                <div className="cbs-panel__title">토큰/지연 요약</div>
                <div className="cbs-muted">
                  기간 내 총 토큰/평균 토큰/평균 지연, 모델별 분포를 확인합니다.
                </div>
                <div className="cbs-muted">
                  API: <span className="cbs-mono">GET /api/admin/stats/usage?days=30</span>
                </div>
              </div>

              <div className="cbs-controls">
                <div className="cbs-field">
                  <span className="cbs-field__label">기간(일)</span>
                  <input
                    type="number"
                    className="cbs-input"
                    value={usageDays}
                    min={1}
                    max={365}
                    onChange={(e) => setUsageDays(Number(e.target.value))}
                  />
                </div>

                <button className="cbs-btn cbs-btn--outline" onClick={loadUsageStats} disabled={busy}>
                  <RefreshCcw size={16} className={busy ? "cbs-spin" : ""} /> 조회
                </button>
              </div>
            </div>

            {!usageStats ? (
              <div className="cbs-alert cbs-alert--info">
                <div className="cbs-alert__title">통계가 아직 없습니다.</div>
                조회 버튼을 눌러 토큰 통계를 불러오세요.
                <div className="cbs-muted" style={{ marginTop: 8 }}>
                  (백엔드 미구현이면 404가 뜹니다. 컨트롤러 1개만 추가하면 바로 연결돼요.)
                </div>
              </div>
            ) : (
              <>
                <div className="cbs-kpi">
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label">총 요청 수</div>
                    <div className="cbs-kpi__value">{fmtInt(usageStats.totalRequests)}</div>
                  </div>
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label">총 토큰</div>
                    <div className="cbs-kpi__value">{fmtInt(usageStats.totalTokens)}</div>
                  </div>
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label">평균 토큰</div>
                    <div className="cbs-kpi__value">{fmtFloat(usageStats.avgTokens, 1)}</div>
                  </div>
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label">평균 지연(ms)</div>
                    <div className="cbs-kpi__value">{fmtFloat(usageStats.avgLatencyMs, 0)}</div>
                  </div>
                </div>

                <div className="cbs-row cbs-row--between">
                  <div className="cbs-section-title">모델별 토큰/지연</div>
                  <div className="cbs-muted">비용/성능 비교</div>
                </div>

                <div className="cbs-table-wrap">
                  <table className="cbs-table">
                    <thead>
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
                          <td colSpan={5} className="cbs-empty">데이터 없음</td>
                        </tr>
                      ) : (
                        (usageStats.byModel ?? []).map((r, i) => (
                          <tr key={`${r.model ?? "UNKNOWN"}-${i}`}>
                            <td className="cbs-mono">{r.model ?? "UNKNOWN"}</td>
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

                <div className="cbs-alert cbs-alert--info" style={{ marginTop: 12 }}>
                  <div className="cbs-alert__title">해석 팁</div>
                  <ul className="cbs-ul">
                    <li><b>총 토큰</b>이 많을수록 비용이 증가합니다.</li>
                    <li><b>평균 지연</b>이 높은 모델/프롬프트는 UX에 영향이 큽니다.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===========================
            TAB: 피드백 통계
        =========================== */}
        {tab === "feedbackstats" && (
          <div className="cbs-panel">
            <div className="cbs-panel__top">
              <div>
                <div className="cbs-panel__title">좋아요/싫어요 요약</div>
                <div className="cbs-muted">
                  기간 내 전체 반응 및 모델별 성능, 싫어요가 많은 메시지를 확인합니다.
                </div>
                <div className="cbs-muted">
                  API: <span className="cbs-mono">GET /api/admin/stats/feedback</span>
                </div>
              </div>

              <div className="cbs-controls">
                <div className="cbs-field">
                  <span className="cbs-field__label">기간(일)</span>
                  <input
                    type="number"
                    className="cbs-input"
                    value={fbDays}
                    min={1}
                    max={365}
                    onChange={(e) => setFbDays(Number(e.target.value))}
                  />
                </div>

                <div className="cbs-field">
                  <span className="cbs-field__label">상위 N</span>
                  <input
                    type="number"
                    className="cbs-input"
                    value={fbTop}
                    min={1}
                    max={50}
                    onChange={(e) => setFbTop(Number(e.target.value))}
                  />
                </div>

                <button className="cbs-btn cbs-btn--outline" onClick={loadFeedbackStats} disabled={busy}>
                  <RefreshCcw size={16} className={busy ? "cbs-spin" : ""} /> 조회
                </button>
              </div>
            </div>

            {!fbStats ? (
              <div className="cbs-alert cbs-alert--info">
                <div className="cbs-alert__title">통계가 아직 없습니다.</div>
                조회 버튼을 눌러 통계를 불러오세요.
              </div>
            ) : (
              <>
                <div className="cbs-kpi">
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label"><ThumbsUp size={14} /> 총 좋아요</div>
                    <div className="cbs-kpi__value">{fmtInt(fbStats.totalLikes)}</div>
                  </div>
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label"><ThumbsDown size={14} /> 총 싫어요</div>
                    <div className="cbs-kpi__value">{fmtInt(fbStats.totalDislikes)}</div>
                  </div>
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label">순점수(좋아요-싫어요)</div>
                    <div className="cbs-kpi__value">{fmtInt(fbStats.net)}</div>
                  </div>
                </div>

                <div className="cbs-grid-2">
                  {/* left */}
                  <div>
                    <div className="cbs-row cbs-row--between">
                      <div className="cbs-section-title">모델별 반응</div>
                      <div className="cbs-muted">모델 품질 비교용</div>
                    </div>

                    <div className="cbs-table-wrap">
                      <table className="cbs-table">
                        <thead>
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
                              <td colSpan={4} className="cbs-empty">데이터 없음</td>
                            </tr>
                          ) : (
                            (fbStats.byModel ?? []).map((r, i) => {
                              const likes = r.likes ?? 0;
                              const dislikes = r.dislikes ?? 0;
                              const net = r.net ?? likes - dislikes;
                              return (
                                <tr key={`${r.model ?? "UNKNOWN"}-${i}`}>
                                  <td className="cbs-mono">{r.model ?? "UNKNOWN"}</td>
                                  <td>{fmtInt(likes)}</td>
                                  <td>{fmtInt(dislikes)}</td>
                                  <td className={net < 0 ? "cbs-neg" : ""}>{fmtInt(net)}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* right */}
                  <div>
                    <div className="cbs-row cbs-row--between">
                      <div className="cbs-section-title">싫어요 많은 답변 TOP</div>
                      <div className="cbs-muted">문제 답변 추적용</div>
                    </div>

                    <div className="cbs-table-wrap">
                      <table className="cbs-table">
                        <thead>
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
                              <td colSpan={4} className="cbs-empty">데이터 없음</td>
                            </tr>
                          ) : (
                            (fbStats.topDislikedMessages ?? []).map((r) => (
                              <tr key={r.chatId}>
                                <td className="cbs-mono">{r.chatId}</td>
                                <td className="cbs-mono">{r.model ?? "-"}</td>
                                <td className="cbs-bad">{fmtInt(r.dislikes)}</td>
                                <td>{fmtInt(r.net)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="cbs-alert cbs-alert--info" style={{ marginTop: 12 }}>
                      <div className="cbs-alert__title">해석 팁</div>
                      <div>
                        순점수는 <b>좋아요 - 싫어요</b>입니다. 값이 낮을수록 만족도가 낮은 답변/모델입니다.
                      </div>
                      <div className="cbs-muted" style={{ marginTop: 8 }}>
                        (추적 확장) top chatId로 근거(chunk)를 조회해 “어떤 문서 조각이 문제인지”까지 추적할 수 있습니다.
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===========================
            TAB: 차단 관리
        =========================== */}
        {tab === "blocked" && (
          <div className="cbs-grid-2 cbs-grid-2--wideLeft">
            {/* left: list */}
            <div className="cbs-panel">
              <div className="cbs-panel__top">
                <div>
                  <div className="cbs-panel__title">차단 목록</div>
                  <div className="cbs-muted">활성 차단된 chunkId는 RAG 검색 결과에서 제외됩니다.</div>
                </div>

                <div className="cbs-controls">
                  <div className="cbs-seg">
                    <button
                      className={`cbs-segbtn ${activeOnly ? "is-active is-danger" : ""}`}
                      onClick={() => setActiveOnly(true)}
                      disabled={busy}
                    >
                      활성(차단중)
                    </button>
                    <button
                      className={`cbs-segbtn ${!activeOnly ? "is-active" : ""}`}
                      onClick={() => setActiveOnly(false)}
                      disabled={busy}
                    >
                      해제됨
                    </button>
                  </div>

                  <input
                    className="cbs-input cbs-input--wide"
                    placeholder="chunkId 또는 사유 검색"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              <div className="cbs-table-wrap">
                <table className="cbs-table">
                  <thead>
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
                        <td colSpan={6} className="cbs-empty">데이터 없음</td>
                      </tr>
                    ) : (
                      filteredBlockedList.map((r) => (
                        <tr key={r.blockId ?? `${r.chunkId}-${r.createdAt}`}>
                          <td>
                            {Number(r.isActive) === 1 ? (
                              <span className="cbs-badge cbs-badge--danger">차단</span>
                            ) : (
                              <span className="cbs-badge cbs-badge--muted">해제</span>
                            )}
                          </td>
                          <td>{r.blockId ?? "-"}</td>
                          <td className="cbs-mono">{r.chunkId}</td>
                          <td title={r.reason ?? ""}>{r.reason ?? "-"}</td>
                          <td className="cbs-muted">{String(r.createdAt ?? "-")}</td>
                          <td>
                            {Number(r.isActive) === 1 ? (
                              <button className="cbs-btn cbs-btn--outline" onClick={() => onUnblock(r.chunkId)} disabled={busy}>
                                <CheckCircle2 size={16} /> 해제
                              </button>
                            ) : (
                              <span className="cbs-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* right: form */}
            <div className="cbs-panel">
              <div className="cbs-panel__top">
                <div>
                  <div className="cbs-panel__title">단건 차단 등록</div>
                  <div className="cbs-muted">동일 chunkId는 Upsert(사유 갱신 + 활성화) 처리됩니다.</div>
                </div>
              </div>

              <div className="cbs-form">
                <div className="cbs-field">
                  <div className="cbs-field__label">chunkId</div>
                  <input
                    className="cbs-input cbs-mono"
                    value={blockChunkId}
                    onChange={(e) => setBlockChunkId(e.target.value)}
                    placeholder="예: 123"
                  />
                </div>

                <div className="cbs-field">
                  <div className="cbs-field__label">사유(선택)</div>
                  <input
                    className="cbs-input"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="예: 반복적으로 싫어요 발생"
                  />
                </div>

                <button className="cbs-btn cbs-btn--danger" onClick={onBlock} disabled={busy}>
                  <Ban size={16} /> 차단 등록
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===========================
            TAB: 자동 차단
        =========================== */}
        {tab === "autoblock" && (
          <div className="cbs-panel">
            <div className="cbs-panel__top">
              <div>
                <div className="cbs-panel__title">나쁜 답변 기반 자동 차단</div>
                <div className="cbs-muted">
                  싫어요가 많은 답변에서 반복 등장하는 chunkId를 찾아 자동으로 차단합니다.
                </div>
              </div>
            </div>

            <div className="cbs-controls cbs-controls--wrap">
              <div className="cbs-field">
                <span className="cbs-field__label">기간(일)</span>
                <input type="number" className="cbs-input" value={autoDays} min={1} max={365} onChange={(e) => setAutoDays(Number(e.target.value))} />
              </div>

              <div className="cbs-field">
                <span className="cbs-field__label">상위 N</span>
                <input type="number" className="cbs-input" value={autoTop} min={1} max={50} onChange={(e) => setAutoTop(Number(e.target.value))} />
              </div>

              <div className="cbs-field">
                <span className="cbs-field__label">나쁜 기준(싫어요 ≥)</span>
                <input type="number" className="cbs-input" value={autoBadN} min={1} max={20} onChange={(e) => setAutoBadN(Number(e.target.value))} />
              </div>

              <input
                className="cbs-input cbs-input--wide"
                placeholder="차단 사유(선택)"
                value={autoReason}
                onChange={(e) => setAutoReason(e.target.value)}
              />

              <button className="cbs-btn cbs-btn--primary" onClick={runAutoBlock} disabled={busy}>
                <Wand2 size={16} /> 실행
              </button>
            </div>

            {autoRes ? (
              <div className="cbs-alert cbs-alert--success">
                <div className="cbs-alert__title">
                  후보 {fmtInt(autoRes.candidateCount)}개 중 {fmtInt(autoRes.blockedCount)}개 차단 처리 완료
                </div>
                <div className="cbs-muted">사유: {autoRes.reason}</div>
              </div>
            ) : (
              <div className="cbs-alert cbs-alert--info">
                <div className="cbs-alert__title">안내</div>
                “나쁜 답변(싫어요 기준)”에 자주 등장하는 chunkId를 찾아 자동 차단합니다.
              </div>
            )}
          </div>
        )}

        {/* ===========================
            TAB: 근거(Chunk) 품질 통계
        =========================== */}
        {tab === "chunkstats" && (
          <div className="cbs-panel">
            <div className="cbs-panel__top">
              <div>
                <div className="cbs-panel__title">근거(Chunk) 품질 통계</div>
                <div className="cbs-muted">
                  어떤 chunk가 자주 참조되는지, 유사도(점수)가 어떤지, 싫어요와 함께 문제가 되는지 확인합니다.
                </div>
              </div>

              <div className="cbs-controls">
                <div className="cbs-field">
                  <span className="cbs-field__label">기간(일)</span>
                  <input type="number" className="cbs-input" value={statsDays} min={1} max={365} onChange={(e) => setStatsDays(Number(e.target.value))} />
                </div>
                <div className="cbs-field">
                  <span className="cbs-field__label">상위 N</span>
                  <input type="number" className="cbs-input" value={statsTop} min={1} max={50} onChange={(e) => setStatsTop(Number(e.target.value))} />
                </div>
                <button className="cbs-btn cbs-btn--outline" onClick={loadRefStats} disabled={busy}>
                  <RefreshCcw size={16} className={busy ? "cbs-spin" : ""} /> 조회
                </button>
              </div>
            </div>

            {!refStats ? (
              <div className="cbs-alert cbs-alert--info">조회 버튼을 눌러 통계를 불러오세요.</div>
            ) : (
              <>
                <div className="cbs-kpi">
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label">총 근거 참조 수</div>
                    <div className="cbs-kpi__value">{fmtInt(refStats.totalRefs)}</div>
                  </div>
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label">평균 유사도 점수</div>
                    <div className="cbs-kpi__value">{fmtScore(refStats.avgScore)}</div>
                  </div>
                  <div className="cbs-kpi__item">
                    <div className="cbs-kpi__label">조회 범위</div>
                    <div className="cbs-kpi__value">
                      {refStats.scope === "MY" ? "내 데이터" : "전체"} · 최근 {fmtInt(refStats.days)}일
                    </div>
                  </div>
                </div>

                <div className="cbs-table-wrap">
                  <table className="cbs-table">
                    <thead>
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
                          <td colSpan={5} className="cbs-empty">데이터 없음</td>
                        </tr>
                      ) : (
                        (refStats.topChunks ?? []).map((r) => (
                          <tr key={r.chunkId}>
                            <td className="cbs-mono">{r.chunkId}</td>
                            <td>{fmtInt(r.count)}</td>
                            <td>{fmtScore(r.avgScore)}</td>
                            <td className={Number(r.sumDislikes ?? 0) > 0 ? "cbs-bad" : ""}>
                              {fmtInt(r.sumDislikes ?? 0)}
                            </td>
                            <td className={Number(r.badAnswerCount ?? 0) > 0 ? "cbs-bad" : ""}>
                              {fmtInt(r.badAnswerCount ?? 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cbs-alert cbs-alert--info" style={{ marginTop: 12 }}>
                  <div className="cbs-alert__title">해석 팁</div>
                  <ul className="cbs-ul">
                    <li><b>참조 횟수</b>: 답변 생성 시 해당 chunk가 근거로 선택된 횟수</li>
                    <li><b>평균 점수</b>: 검색 유사도(높을수록 질문과 더 관련)</li>
                    <li><b>싫어요 합계 / 나쁜 답변 수</b>: 이 chunk를 쓴 답변들이 얼마나 불만을 받았는지 추적</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
