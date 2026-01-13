import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "../Tool";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  ClipboardCheck,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/**
 * AdminPostChecklistAiPanel
 * - templateId 기준으로
 *   1) /admin/ai/post/templates/{templateId}/items/stats
 *   2) /admin/ai/post/templates/{templateId}/items/signals
 *   조회해서 관리자에게 개선 인사이트 제공
 *
 * ✅ 지금은 "액션 버튼"은 UI만 (실제 PATCH/POST는 나중에 연결)
 */
export default function AdminPostChecklistAiPanel({ templateId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState([]);
  const [signals, setSignals] = useState([]);

  // 펼침/접힘
  const [open, setOpen] = useState(true);

  const signalMap = useMemo(() => {
    const m = new Map();
    (signals || []).forEach((s) => m.set(Number(s.itemId), s));
    return m;
  }, [signals]);

  const load = async () => {
    if (!templateId) return;
    try {
      setLoading(true);
      setError("");

      const [a, b] = await Promise.all([
        axiosInstance.get(`/admin/ai/post/templates/${templateId}/items/stats`),
        axiosInstance.get(`/admin/ai/post/templates/${templateId}/items/signals`),
      ]);

      setStats(Array.isArray(a?.data) ? a.data : []);
      setSignals(Array.isArray(b?.data) ? b.data : []);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "AI 통계 로드 중 오류";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // --- UI helpers ---
  const pct = (v) => `${Math.round((Number(v || 0) * 100) * 10) / 10}%`;

  function signalBadge(type) {
    const t = String(type || "KEEP");
    if (t === "IMPROVE_COPY") return <span className="badge text-bg-warning rounded-pill">문구 개선</span>;
    if (t === "REMOVE_CANDIDATE") return <span className="badge text-bg-danger rounded-pill">제거 후보</span>;
    if (t === "INSIGHT_CANDIDATE") return <span className="badge text-bg-success rounded-pill">강조/승격</span>;
    return <span className="badge text-bg-secondary rounded-pill">유지</span>;
  }

  function actionHint(type) {
    const t = String(type || "KEEP");
    if (t === "IMPROVE_COPY") return "설명/제목을 더 구체적으로 개선 추천";
    if (t === "REMOVE_CANDIDATE") return "비활성화 또는 대체 항목 검토";
    if (t === "INSIGHT_CANDIDATE") return "필수 승격 또는 상단 배치 검토";
    return "현 상태 유지";
  }

  // 간단한 요약 카드(몇 개가 개선/제거/강조인지)
  const summary = useMemo(() => {
    const res = { KEEP: 0, IMPROVE_COPY: 0, REMOVE_CANDIDATE: 0, INSIGHT_CANDIDATE: 0 };
    (signals || []).forEach((s) => {
      const k = String(s.signal || "KEEP");
      if (res[k] == null) res[k] = 0;
      res[k] += 1;
    });
    return res;
  }, [signals]);

  return (
    <div className="border rounded-5 p-4 shadow-sm bg-white">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <Sparkles size={18} style={{ color: "#059669" }} />
          <div className="fw-bold" style={{ color: "#059669" }}>
            사후 체크리스트 AI 개선 패널
          </div>
          <span className="badge text-bg-light rounded-pill">templateId: {templateId}</span>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-sm btn-outline-secondary rounded-pill"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <>
                <ChevronUp size={16} className="me-1" /> 접기
              </>
            ) : (
              <>
                <ChevronDown size={16} className="me-1" /> 펼치기
              </>
            )}
          </button>

          <button
            className="btn btn-sm btn-outline-emerald rounded-pill fw-bold"
            onClick={load}
            disabled={loading}
          >
            <RefreshCcw size={16} className="me-1" />
            새로고침
          </button>
        </div>
      </div>

      {!open && (
        <div className="mt-3 text-secondary small">
          패널이 접혀있습니다. “펼치기”를 누르면 통계/시그널을 확인할 수 있어요.
        </div>
      )}

      {open && (
        <>
          <div className="mt-3">
            <div className="row g-3">
              <div className="col-12 col-md-3">
                <div className="p-3 rounded-4 border bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <ClipboardCheck size={16} />
                    <div className="fw-bold">유지</div>
                  </div>
                  <div className="display-6 fw-bold mb-0">{summary.KEEP}</div>
                  <div className="text-muted small">현재 상태 유지 권장</div>
                </div>
              </div>

              <div className="col-12 col-md-3">
                <div className="p-3 rounded-4 border bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <AlertTriangle size={16} />
                    <div className="fw-bold">문구 개선</div>
                  </div>
                  <div className="display-6 fw-bold mb-0">{summary.IMPROVE_COPY}</div>
                  <div className="text-muted small">완료율/지표가 안 좋은 항목</div>
                </div>
              </div>

              <div className="col-12 col-md-3">
                <div className="p-3 rounded-4 border bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <TrendingUp size={16} />
                    <div className="fw-bold">강조/승격</div>
                  </div>
                  <div className="display-6 fw-bold mb-0">{summary.INSIGHT_CANDIDATE}</div>
                  <div className="text-muted small">필수 승격/상단 배치 후보</div>
                </div>
              </div>

              <div className="col-12 col-md-3">
                <div className="p-3 rounded-4 border bg-white h-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="badge text-bg-danger rounded-pill">!</span>
                    <div className="fw-bold">제거 후보</div>
                  </div>
                  <div className="display-6 fw-bold mb-0">{summary.REMOVE_CANDIDATE}</div>
                  <div className="text-muted small">효율 낮은 항목</div>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="mt-4 p-4 rounded-4 border text-center bg-white">불러오는 중…</div>
          )}

          {!loading && error && (
            <div className="mt-4 p-4 rounded-4 border text-danger bg-white">에러: {error}</div>
          )}

          {!loading && !error && stats.length === 0 && (
            <div className="mt-4 p-4 rounded-4 border text-center bg-white">
              통계 데이터가 없어요. (COMPLETED POST 세션이 부족하거나, 만족도/응답이 없을 수 있음)
            </div>
          )}

          {!loading && !error && stats.length > 0 && (
            <div className="mt-4">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="fw-bold">항목별 통계 + 개선 시그널</div>
                <div className="text-muted small">
                  doneRate / notDoneRate / notRequiredRate는 "세션 기준 비율"이에요.
                </div>
              </div>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr className="text-muted">
                      <th style={{ width: 70 }}>순서</th>
                      <th style={{ width: 120 }}>영역</th>
                      <th>항목</th>
                      <th style={{ width: 90 }}>필수</th>

                      <th style={{ width: 110 }} className="text-end">표본</th>
                      <th style={{ width: 110 }} className="text-end">완료</th>
                      <th style={{ width: 110 }} className="text-end">미완료</th>
                      <th style={{ width: 130 }} className="text-end">해당없음</th>

                      <th style={{ width: 140 }} className="text-end">완료율</th>
                      <th style={{ width: 140 }} className="text-end">미완료율</th>

                      <th style={{ width: 140 }} className="text-end">done 평균</th>
                      <th style={{ width: 140 }} className="text-end">not 평균</th>
                      <th style={{ width: 120 }} className="text-end">Δ</th>

                      <th style={{ width: 160 }}>시그널</th>
                      <th style={{ width: 260 }}>권장</th>
                      <th style={{ width: 260 }} className="text-end">액션(UI)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stats.map((s) => {
                      const sig = signalMap.get(Number(s.itemId));
                      const type = sig?.signal || "KEEP";

                      return (
                        <tr key={s.itemId}>
                          <td className="fw-bold">{s.itemOrder}</td>
                          <td className="small">{s.checkArea || "-"}</td>
                          <td>
                            <div className="fw-bold">{s.title}</div>
                            <div className="text-muted small">
                              itemId: {s.itemId}
                            </div>
                          </td>
                          <td>
                            <span className={`badge rounded-pill ${s.requiredYn === "Y" ? "text-bg-success" : "text-bg-secondary"}`}>
                              {s.requiredYn === "Y" ? "필수" : "선택"}
                            </span>
                          </td>

                          <td className="text-end">{s.totalCnt}</td>
                          <td className="text-end">{s.doneCnt}</td>
                          <td className="text-end">{s.notDoneCnt}</td>
                          <td className="text-end">{s.notRequiredCnt}</td>

                          <td className="text-end">{pct(s.doneRate)}</td>
                          <td className="text-end">{pct(s.notDoneRate)}</td>

                          <td className="text-end">{s.avgRatingWhenDone ?? "-"}</td>
                          <td className="text-end">{s.avgRatingWhenNotDone ?? "-"}</td>
                          <td className="text-end">{s.deltaRating ?? "-"}</td>

                          <td>{signalBadge(type)}</td>
                          <td className="small">
                            <div className="fw-bold">{actionHint(type)}</div>
                            <div className="text-muted">
                              {sig?.reason || "—"}
                            </div>
                          </td>

                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2 flex-wrap">
                              <button
                                className="btn btn-sm btn-outline-secondary rounded-pill"
                                onClick={() => alert("TODO: 제목/설명 편집 UI 연결")}
                              >
                                문구 수정
                              </button>

                              <button
                                className="btn btn-sm btn-outline-emerald rounded-pill fw-bold"
                                onClick={() => alert("TODO: 필수 승격 API 연결")}
                                disabled={s.requiredYn === "Y"}
                                title={s.requiredYn === "Y" ? "이미 필수입니다" : "필수로 변경"}
                              >
                                필수 승격
                              </button>

                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill"
                                onClick={() => alert("TODO: 항목 비활성화 API 연결")}
                              >
                                비활성화
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-muted small mt-2">
                * “액션(UI)” 버튼은 지금은 화면만 있고, 실제 반영 API는 다음 단계에서 붙이면 돼.
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.2s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
      `}</style>
    </div>
  );
}
