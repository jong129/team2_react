import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, PlusCircle, Settings } from "lucide-react";

const AdminChecklistManage = () => {
  const navigate = useNavigate();

  /* =========================
 * ✅ 로그인 체크
 * ========================= */
  useEffect(() => {
    const memberId = Number(localStorage.getItem("loginMemberId")) || 0;

    if (!memberId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold mb-1">체크리스트 관리</h2>
          <div className="text-secondary small">체크리스트 템플릿 및 항목을 관리합니다</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/dashboard")}>
          뒤로
        </button>
      </div>

      {/* 카드 영역 */}
      <div className="row g-3">
        {/* 템플릿 관리 */}
        <div className="col-md-4">
          <div className="border rounded-4 p-4 shadow-sm h-100">
            <ClipboardList size={32} className="mb-3" color="#059669" />
            <h5 className="fw-bold">템플릿 관리</h5>
            <p className="text-secondary small">사전 / 사후 체크리스트 템플릿 관리</p>
            <button
              className="btn btn-sm btn-success"
              onClick={() => navigate("/admin/checklists/templates")}
            >
              템플릿 목록
            </button>
          </div>
        </div>

        {/* AI 사후 체크리스트 생성 */}
        <div className="col-md-4">
          <div className="border rounded-4 p-4 shadow-sm h-100">
            <PlusCircle size={32} className="mb-3" color="#059669" />
            <h5 className="fw-bold">사후 체크리스트 AI 개선 엔진</h5>
            <p className="text-secondary small">
              실제 사용자 행동 데이터를 분석해, 개선이 필요한 사후 체크리스트 템플릿 초안을 AI가 생성합니다
            </p>
            <button
              className="btn btn-sm btn-success"
              onClick={() => navigate("/admin/ai/post")}
            >
              AI기반 템플릿 개선 보기
            </button>
          </div>
        </div>

        {/* AI POST 분기 검증 */}
        <div className="col-md-4">
          <div className="border rounded-4 p-4 shadow-sm h-100">
            <Settings size={32} className="mb-3" color="#059669" />
            <h5 className="fw-bold">POST 분기 AI 검증</h5>
            <p className="text-secondary small">
              사전 체크리스트 결과를 기준으로 AI 위험도 점수와
              POST_A / POST_B 분기 판단 과정을 확인합니다
            </p>
            <button
              className="btn btn-sm btn-success"
              onClick={() => navigate("/admin/ai/post-decision-test")}
            >
              분기 테스트 열기
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminChecklistManage;
