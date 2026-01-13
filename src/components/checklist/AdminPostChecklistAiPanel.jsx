import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "../Tool";
import { useNavigate } from "react-router-dom";

const badgeClass = (signal) => {
  switch (signal) {
    case "IMPROVE_COPY":
      return "badge text-bg-warning";
    case "INSIGHT_CANDIDATE":
      return "badge text-bg-info";
    case "REMOVE_CANDIDATE":
      return "badge text-bg-danger";
    case "KEEP":
    default:
      return "badge text-bg-success";
  }
};

/** ✅ 도넛 게이지(평균 만족도 0~5 → 0~100%) */
function DonutGauge({ value = null, max = 5, size = 84, stroke = 10 }) {
  const v = typeof value === "number" ? Math.max(0, Math.min(value, max)) : null;
  const pct = v === null ? 0 : (v / max) * 100;

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="d-flex align-items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* center text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{ fontSize: 14, fontWeight: 800 }}
        >
          {v === null ? "-" : v.toFixed(1)}
        </text>
        <text
          x="50%"
          y="64%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{ fontSize: 11, fill: "rgba(0,0,0,0.45)" }}
        >
          / {max}
        </text>
      </svg>

      <div className="small text-secondary">
        <div className="fw-semibold text-dark">평균 만족도</div>
        <div>
          {v === null ? (
            <>데이터 없음</>
          ) : (
            <>
              {v.toFixed(2)} / {max}{" "}
              <span className="text-secondary">({Math.round(pct)}%)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPostChecklistAiPanel() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signals, setSignals] = useState([]);

  // ✅ AI 개선(새 템플릿 생성) 상태
  const [improving, setImproving] = useState(false);
  const [improveMsg, setImproveMsg] = useState("");

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axiosInstance.get("/admin/ai/post/templates");
      const rows = res.data || [];
      setTemplates(rows);

      if (rows.length > 0) {
        setSelectedTemplateId(String(rows[0].templateId));
      }
    } catch (e) {
      setError("AI 템플릿 목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const loadSignals = async (templateId) => {
    if (!templateId) return;
    try {
      setSignalsLoading(true);
      setError("");
      const res = await axiosInstance.get(
        `/admin/ai/post/templates/${templateId}/items/signals`
      );
      setSignals(res.data || []);
    } catch (e) {
      setError("시그널 조회 실패");
      setSignals([]);
    } finally {
      setSignalsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      setImproveMsg("");
      loadSignals(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t.templateId) === String(selectedTemplateId)),
    [templates, selectedTemplateId]
  );

  const completedCnt = selectedTemplate?.completedSessionCnt ?? 0;
  const avgRating = typeof selectedTemplate?.avgRating === "number" ? selectedTemplate.avgRating : null;

  // ✅ 버튼 클릭: AI가 새 템플릿 생성(상태 DRAFT)
  const runImprove = async () => {
    if (!selectedTemplateId) return;

    try {
      setImproving(true);
      setError("");
      setImproveMsg("");

      // ⚠️ 백엔드 아직이면 아래 endpoint는 추후 맞춰서 바꾸면 됨
      // 기대 응답 예시:
      // { newTemplateId: 123, message: "DRAFT 템플릿 생성 완료" }
      const res = await axiosInstance.post(
        `/admin/ai/post/templates/${selectedTemplateId}/improve`
      );

      const newTemplateId = res.data?.newTemplateId;
      const message = res.data?.message || "개선된 DRAFT 템플릿을 생성했습니다.";

      setImproveMsg(message);

      // 새 템플릿 id가 오면 바로 편집 화면으로 이동하는 UX도 자연스러움
      if (newTemplateId) {
        navigate(`/admin/checklists/templates/${newTemplateId}/edit`);
      }
    } catch (e) {
      // 백엔드 미구현이면 404 등 날 수 있으니 UX용 문구
      setError("AI 개선(새 템플릿 생성) 요청 실패");
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">사후 체크리스트 AI 개선 엔진</h2>
          <div className="text-secondary small">
            사용자 완료/미완료 + 만족도 데이터를 기반으로 개선 시그널을 생성합니다
          </div>
        </div>

        <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/checklist")}>
          뒤로
        </button>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {improveMsg && <div className="alert alert-success py-2">{improveMsg}</div>}

      {/* ✅ 템플릿 선택 */}
      <div className="border rounded-4 shadow-sm p-3 mb-3">
        {loading ? (
          <div className="text-secondary">템플릿 목록 불러오는 중...</div>
        ) : (
          <div className="row g-2 align-items-end">
            <div className="col-md-8">
              <label className="form-label small mb-1">분석할 템플릿 선택</label>
              <select
                className="form-select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.postGroupCode} · v{t.versionNo} · {t.templateName} (id:{t.templateId})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4 text-md-end">
              {selectedTemplate && (
                <div className="small text-secondary">
                  선택됨: <b className="text-dark">{selectedTemplate.templateName}</b>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ KPI 카드 2개 */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="border rounded-4 shadow-sm p-3 h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-secondary small">완료 세션 수</div>
                <div className="display-6 fw-bold mb-1">{completedCnt}</div>
                <div className="text-secondary small">
                  최근 데이터 기반으로 학습 가능한 표본 규모를 의미합니다
                </div>
              </div>
              <span className="badge text-bg-light border">KPI</span>
            </div>

            {/* 간단한 바(시각적 강조용) */}
            <div className="mt-3">
              <div className="d-flex justify-content-between small text-secondary mb-1">
                <span>표본 규모</span>
                <span>{completedCnt} sessions</span>
              </div>
              <div className="progress" style={{ height: 10 }}>
                {/* 색 지정 없이 부트스트랩 기본 */}
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${Math.min(100, completedCnt)}%` }}
                  aria-valuenow={Math.min(100, completedCnt)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              <div className="small text-secondary mt-1">
                (임시) 100을 기준으로 시각화 — 필요하면 “최근 30일 대비”로 바꾸면 더 의미있음
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="border rounded-4 shadow-sm p-3 h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="text-secondary small">평균 만족도</div>
                <div className="fw-bold" style={{ fontSize: 18 }}>
                  {avgRating === null ? "-" : avgRating.toFixed(2)} / 5
                </div>
                <div className="text-secondary small">
                  낮은 만족도는 “문장/순서/필수 여부/중복” 개선 우선순위로 사용합니다
                </div>
              </div>
              <span className="badge text-bg-light border">KPI</span>
            </div>

            <div className="mt-3 text-primary">
              <DonutGauge value={avgRating} />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 개선 시그널 (새로고침 제거) */}
      <div className="border rounded-4 shadow-sm p-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="fw-bold">개선 시그널</div>
          <div className="small text-secondary">
            시그널을 기반으로 “새 템플릿 생성”을 수행합니다
          </div>
        </div>

        {signalsLoading ? (
          <div className="py-4 text-center text-secondary">불러오는 중...</div>
        ) : signals.length === 0 ? (
          <div className="py-4 text-center text-secondary">표시할 시그널이 없습니다.</div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 70 }}>순서</th>
                  <th>항목</th>
                  <th style={{ width: 160 }}>시그널</th>
                  <th>사유</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.itemId}>
                    <td className="text-secondary">{s.itemOrder}</td>
                    <td>
                      <div className="fw-semibold">{s.title}</div>
                      <div className="text-secondary small">
                        itemId: {s.itemId} · 필수: {s.requiredYn}
                      </div>
                    </td>
                    <td>
                      <span className={badgeClass(s.signal)}>{s.signal}</span>
                    </td>
                    <td className="text-secondary">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ 하단 CTA */}
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
          <div className="small text-secondary">
            버튼을 누르면 현재 템플릿을 기반으로 AI가 항목을 재구성하여 <b className="text-dark">새 DRAFT 템플릿</b>을 생성합니다.
          </div>

          <button
            className="btn btn-success"
            disabled={!selectedTemplateId || improving}
            onClick={runImprove}
          >
            {improving ? "AI 개선 중..." : "AI로 새 템플릿 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
