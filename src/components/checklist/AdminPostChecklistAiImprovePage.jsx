import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Tool";

export default function AdminPostChecklistAiImprovePage() {
  const navigate = useNavigate();
  const { templateId } = useParams();

  /* ============================
   * 로그인 체크
   * ============================ */
  useEffect(() => {
    const loginMemberId = localStorage.getItem("loginMemberId");
    if (!loginMemberId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [navigate]);

  /* ============================
   * 상태
   * ============================ */
  const [baseTemplate, setBaseTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ✅ 개선 요약 상태
  const [improveSummary, setImproveSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ✅ 저장 상태
  const [saveLoading, setSaveLoading] = useState(false);


  /* ============================
   * 기존 템플릿 조회
   * ============================ */
  useEffect(() => {
    if (!templateId) return;

    setPreview(null);
    setImproveSummary([]);

    const fetchBaseTemplate = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axiosInstance.get(
          `/admin/checklists/ai/templates/${templateId}/base`
        );
        setBaseTemplate(res.data);
      } catch (err) {
        console.error(err);
        setError("기존 템플릿을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchBaseTemplate();
  }, [templateId]);

  /* ============================
   * AI 개선 미리보기
   * ============================ */
  const fetchPreview = async () => {
    try {
      setPreviewLoading(true);
      setImproveSummary([]);

      const res = await axiosInstance.post(
        `/admin/checklists/ai/templates/${templateId}/preview`,
        {}
      );

      setPreview(res.data);
    } catch (e) {
      console.error(e);
      alert("AI 개선 미리보기를 불러오지 못했습니다.");
    } finally {
      setPreviewLoading(false);
    }
  };

  /* ============================
   * AI 개선 요약 보기
   * ============================ */
  const fetchImproveSummary = async () => {
    if (!preview) {
      alert("먼저 개선 템플릿을 생성해주세요.");
      return;
    }

    try {
      setSummaryLoading(true);

      /**
       * ⚠️ 현재는 예시 데이터
       * 나중에 Spring에서 실제 통계/만족도 데이터를 받아서 교체
       */
      const dummyUserStats = preview.items.map((item) => ({
        itemTitle: item.title,
        doneRate: 0.6,
        notDoneRate: 0.3,
        notRequiredRate: 0.1,
      }));

      const dummySatisfaction = {
        avgScore: 3.2,
        negativeKeywords: ["설명 부족", "왜 필요한지 모르겠음"],
      };

      const res = await axiosInstance.post(
        "/admin/checklists/ai/improve/summary",
        {
          templateId: Number(templateId),
          previewItems: preview.items,
          userStats: dummyUserStats,
          satisfaction: dummySatisfaction,
        }
      );

      setImproveSummary(res.data.summaries || []);
    } catch (e) {
      console.error(e);
      alert("개선 요약을 불러오지 못했습니다.");
    } finally {
      setSummaryLoading(false);
    }
  };

  /* ============================
 * AI 개선 템플릿 저장
 * ============================ */
  const saveImprovedTemplate = async () => {
    if (!preview) {
      alert("저장할 개선 템플릿이 없습니다.");
      return;
    }

    try {
      setSaveLoading(true);

      // 🔹 저장용 payload 생성
      const payload = {
        items: preview.items.map((item) => ({
          itemOrder: item.itemOrder,
          title: item.title,
          description: item.description,
          requiredYn: item.requiredYn || "N",
        })),
      };

      await axiosInstance.post(
        `/admin/checklists/ai/templates/${templateId}/save`,
        payload
      );

      alert("AI 개선 템플릿이 초안으로 저장되었습니다.");

      // ✅ 저장 후 관리자 템플릿 목록으로 이동
      navigate("/admin/checklists/templates");
    } catch (e) {
      console.error(e);
      alert("템플릿 저장 중 오류가 발생했습니다.");
    } finally {
      setSaveLoading(false);
    }
  };


  return (
    <div
      className="container-fluid py-4"
      style={{ fontFamily: "'Pretendard', sans-serif" }}
    >
      {/* 가운데 정렬 래퍼 */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* 상단 헤더 */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-1">AI 기반 사후 체크리스트 개선</h4>
            <div className="text-secondary small">
              기존 템플릿을 기준으로 AI 개선 초안을 생성합니다.
            </div>
          </div>

          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate(-1)}
          >
            뒤로
          </button>
        </div>

        {/* 카드 영역 */}
        <div className="row g-4">
          {/* 좌측: 기존 템플릿 */}
          <div className="col-md-6">
            <div className="border rounded-4 shadow-sm p-4 h-100">
              <h5 className="fw-bold mb-3">기존 템플릿</h5>

              {loading && (
                <div className="small text-secondary">불러오는 중...</div>
              )}
              {error && (
                <div className="small text-danger">{error}</div>
              )}

              {baseTemplate && (
                <>
                  <div className="small text-secondary mb-2">
                    {baseTemplate.templateName} (v{baseTemplate.versionNo})
                  </div>

                  <ul className="list-group list-group-flush">
                    {baseTemplate.items.map((item) => (
                      <li
                        key={item.itemId}
                        className="list-group-item px-0"
                      >
                        <div className="fw-semibold">
                          {item.itemOrder}. {item.title}
                        </div>

                        {item.description && (
                          <div className="small text-secondary">
                            {item.description}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* 우측: AI 개선 템플릿 */}
          <div className="col-md-6">
            <div className="border rounded-4 shadow-sm p-4 h-100 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                  AI 개선 템플릿 (미리보기)
                </h5>

                <button
                  className="btn btn-sm btn-success rounded-pill"
                  onClick={fetchPreview}
                  disabled={previewLoading}
                >
                  {previewLoading ? "AI 생성 중..." : "개선 템플릿 생성"}
                </button>
              </div>

              {!preview && !previewLoading && (
                <div className="text-center text-secondary small">
                  아직 미리보기가 생성되지 않았습니다.
                </div>
              )}

              {preview && (
                <>
                  <ul className="list-group list-group-flush">
                    {preview.items.map((item) => (
                      <li
                        key={item.itemOrder}
                        className="list-group-item px-0 bg-light"
                      >
                        <div className="fw-semibold">
                          {item.itemOrder}. {item.title}
                        </div>

                        {item.description && (
                          <div className="small text-secondary">
                            {item.description}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="small text-muted mt-3">
                    ※ 이 템플릿은 아직 저장되지 않은 초안입니다.
                  </div>
                  {preview && (
                    <div className="d-flex justify-content-end mt-3">
                      <button
                        className="btn btn-primary"
                        onClick={saveImprovedTemplate}
                        disabled={saveLoading}
                      >
                        {saveLoading ? "저장 중..." : "저장하기"}
                      </button>
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
        </div>

        {/* 개선 요약 */}
        <div className="border rounded-4 shadow-sm p-4 mt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">📌 개선 요약</h5>

            <button
              className="btn btn-sm btn-outline-primary"
              onClick={fetchImproveSummary}
              disabled={summaryLoading}
            >
              {summaryLoading ? "요약 생성 중..." : "개선 요약 보기"}
            </button>
          </div>

          {improveSummary.length === 0 && (
            <div className="small text-secondary">
              아직 개선 요약이 생성되지 않았습니다.
            </div>
          )}

          {improveSummary.map((s, idx) => (
            <div key={idx} className="mb-3">
              <div className="fw-semibold mb-1">
                • {s.title}
              </div>
              <div className="small text-secondary">
                {s.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
