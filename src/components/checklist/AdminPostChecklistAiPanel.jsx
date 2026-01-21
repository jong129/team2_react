import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

/**
 * ============================
 * 상수 정의
 * ============================
 */
const STATUS_LABEL = {
  DRAFT: "초안",
  ACTIVE: "활성화",
  RETIRED: "비활성화",
};

function badgeClass(status) {
  switch (status) {
    case "ACTIVE":
      return "badge text-bg-success";
    case "DRAFT":
      return "badge text-bg-secondary";
    case "RETIRED":
      return "badge text-bg-dark";
    default:
      return "badge text-bg-light";
  }
}

/**
 * ============================
 * 메인 컴포넌트
 * ============================
 */
export default function AdminPostChecklistAiPanel() {
  const navigate = useNavigate();

  /* =======================
 * ✅ 로그인 체크
 * ======================= */
  useEffect(() => {
    const memberId = Number(localStorage.getItem("loginMemberId")) || 0;

    if (!memberId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [navigate]);

  /* ===== 좌측 템플릿 목록 ===== */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageData, setPageData] = useState(null);
  const [page, setPage] = useState(0);
  const size = 10;

  /* ===== 선택 템플릿 ===== */
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  /* ===== AI 분석 ===== */
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  /* ===== 만족도 요약 (LLM) ===== */
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  /**
   * ============================
   * POST 템플릿 목록 조회
   * ============================
   */
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axiosInstance.get(
        "/admin/checklists/templates/list",
        {
          params: {
            phase: "POST",
            page,
            size,
          },
        }
      );

      setPageData(res.data);
    } catch (e) {
      setError("사후 체크리스트 템플릿 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ============================
   * 선택 템플릿 분석 조회
   * ============================
   */
  const fetchAnalysis = async (templateId) => {
    try {
      setAnalysisLoading(true);
      setAnalysis(null);

      const res = await axiosInstance.get(
        `/admin/checklists/post/templates/${templateId}/analysis`
      );

      setAnalysis(res.data);
    } catch (e) {
      console.error(e);
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  };

  /**
   * ============================
   * 만족도 요약 조회 (LLM)
   * ============================
   */
  const fetchSummary = async (templateId) => {
    try {
      setSummaryLoading(true);
      setSummary(null);

      const res = await axiosInstance.post(
        `/admin/checklists/post/templates/${templateId}/summary`
      );

      setSummary(res.data);
      setShowSummary(true);
    } catch (e) {
      console.error(e);
      alert("만족도 요약을 불러오지 못했습니다.");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const rows = pageData?.content ?? [];

  /**
   * ============================
   * 렌더링
   * ============================
   */
  return (
    <>
      <div
        className="container-fluid py-4"
        style={{ fontFamily: "'Pretendard', sans-serif" }}
      >
        <div className="row g-3">

          {/* ============================
              좌측: 템플릿 목록
          ============================ */}
          <div className="col-md-5 offset-md-1">
            <div className="mb-2">
              <h5 className="fw-bold mb-1">사후 체크리스트 템플릿</h5>
              <div className="small text-secondary">
                사용자 만족도 분석 대상 템플릿 목록
              </div>
            </div>

            <div className="border rounded-4 shadow-sm overflow-hidden">
              <table className="table align-middle m-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 70 }}>ID</th>
                    <th style={{ width: 100 }}>상태</th>
                    <th>템플릿명</th>
                    <th style={{ width: 90 }}>버전</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-secondary">
                        불러오는 중...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-secondary">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.templateId}
                        style={{ cursor: "pointer" }}
                        className={
                          selectedTemplate?.templateId === r.templateId
                            ? "table-success"
                            : ""
                        }
                        onClick={() => {
                          setSelectedTemplate(r);
                          fetchAnalysis(r.templateId);
                        }}
                      >
                        <td>{r.templateId}</td>
                        <td>
                          <span className={badgeClass(r.status)}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        <td
                          className="fw-semibold text-truncate"
                          style={{ maxWidth: 220 }}
                        >
                          {r.templateName}
                        </td>
                        <td>v{r.versionNo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ============================
              우측: AI 분석 패널
          ============================ */}
          <div className="col-md-5">
            <div className="d-flex justify-content-end mb-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => navigate("/admin/checklist")}
              >
                뒤로
              </button>
            </div>

            <div className="border rounded-4 p-4 shadow-sm h-100">
              {!selectedTemplate ? (
                <div className="text-secondary text-center mt-5">
                  좌측에서 템플릿을 선택하세요
                </div>
              ) : (
                <>
                  <h5 className="fw-bold mb-3">
                    {selectedTemplate.templateName}
                  </h5>

                  <div className="d-flex gap-3 mb-4">
                    <div className="border rounded-3 p-3 flex-fill text-center">
                      <div className="small text-secondary">참여 사용자</div>
                      <div className="fs-4 fw-bold">
                        {analysis?.participantCount ?? 0}명
                      </div>
                    </div>
                    <div className="border rounded-3 p-3 flex-fill text-center">
                      <div className="small text-secondary">평균 만족도</div>
                      <div className="fs-4 fw-bold">
                        {analysis?.avgScore ?? 0} / 5
                      </div>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2 mb-3">
                    {analysis?.recentComments?.length === 0 ? (
                      <div className="text-secondary small">
                        아직 등록된 만족도 코멘트가 없습니다.
                      </div>
                    ) : (
                      analysis?.recentComments?.map((c, idx) => (
                        <div key={idx} className="border rounded-3 p-3">
                          <div className="fw-semibold mb-1">
                            ⭐ {c.score}점
                          </div>
                          <div className="small text-secondary">
                            {c.comment}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="d-flex flex-column gap-2">

                    {/* 사용자 만족도 요약 보기 */}
                    <div
                      className="border rounded-3 p-3 d-flex justify-content-between align-items-center"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        fetchSummary(selectedTemplate.templateId)
                      }
                    >
                      <div>
                        <div className="fw-semibold">
                          사용자 만족도 요약 보기
                        </div>
                        <div className="small text-secondary">
                          사용자의 주요 의견을 요약해줍니다
                        </div>
                      </div>
                      <span className="badge text-bg-light border">보기</span>
                    </div>

                    {/* 🔥 AI 기반 템플릿 개선 요청 (여기 추가) */}
                    <div
                      className="border rounded-3 p-3 d-flex justify-content-between align-items-center bg-light"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/admin/ai/post/improve/${selectedTemplate.templateId}`)
                      }
                    >
                      <div>
                        <div className="fw-semibold">AI 기반 템플릿 개선 요청</div>
                        <div className="small text-secondary">
                          사용자 만족도 데이터를 분석해 개선된 초안을 생성합니다
                        </div>
                      </div>
                      <span className="badge text-bg-success">요청</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================
          사용자 만족도 요약 모달 (추가)
      ============================ */}
      {showSummary && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.35)", zIndex: 1050 }}
        >
          <div
            className="bg-white rounded-5 shadow p-4"
            style={{ width: "min(640px, 94vw)" }}
          >
            <div className="fw-bold mb-3" style={{ color: "#059669" }}>
              사용자 만족도 요약
            </div>

            {summaryLoading && (
              <div className="text-secondary">요약 생성 중...</div>
            )}

            {!summaryLoading && summary && (
              <div className="d-flex flex-column gap-3">
                <div>
                  <div className="fw-semibold mb-1">👍 긍정적인 반응</div>
                  <ul className="small text-secondary mb-0">
                    {summary.positive?.length > 0
                      ? summary.positive.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))
                      : <li>특이사항 없음</li>}
                  </ul>
                </div>

                <div>
                  <div className="fw-semibold mb-1">⚠️ 아쉬운 점</div>
                  <ul className="small text-secondary mb-0">
                    {summary.negative?.length > 0
                      ? summary.negative.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))
                      : <li>특이사항 없음</li>}
                  </ul>
                </div>

                <div>
                  <div className="fw-semibold mb-1">💡 개선 제안</div>
                  <ul className="small text-secondary mb-0">
                    {summary.suggestions?.length > 0
                      ? summary.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))
                      : <li>특이사항 없음</li>}
                  </ul>
                </div>
              </div>
            )}

            <div className="d-flex justify-content-end mt-4">
              <button
                className="btn btn-outline-secondary rounded-pill"
                onClick={() => setShowSummary(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
