import React from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, PlusCircle, Settings } from "lucide-react";

const AdminChecklistManage = () => {
  const navigate = useNavigate();

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

        {/* 항목 관리 */}
        <div className="col-md-4">
          <div className="border rounded-4 p-4 shadow-sm h-100">
            <Settings size={32} className="mb-3" color="#059669" />
            <h5 className="fw-bold">항목 관리</h5>
            <p className="text-secondary small">체크리스트 항목 등록 / 수정 / 비활성화</p>
            <button
              className="btn btn-sm btn-success"
              onClick={() => navigate("/admin/checklists/items")}
              disabled
              title="다음 단계에서 구현"
            >
              항목 관리
            </button>
          </div>
        </div>

        {/* 신규 생성 */}
        <div className="col-md-4">
          <div className="border rounded-4 p-4 shadow-sm h-100">
            <PlusCircle size={32} className="mb-3" color="#059669" />
            <h5 className="fw-bold">신규 생성</h5>
            <p className="text-secondary small">새로운 체크리스트 템플릿 생성</p>
            <button
              className="btn btn-sm btn-outline-success"
              onClick={() => navigate("/admin/checklists/templates/new")}
              disabled
              title="다음 단계에서 구현"
            >
              새 템플릿 만들기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChecklistManage;
