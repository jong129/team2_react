import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import { Users, ListChecks, MessageSquareText, BarChart3, ClipboardList } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    axiosInstance
      .get("/api/admin/dashboard")
      .then((res) => setMessage(res.data))
      .catch((err) => {
        if (err.response?.status === 401) setError("로그인이 필요합니다.");
        else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
        else setError("접근 오류");
      });
  }, []);

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <h2 className="fw-bold mb-3">관리자 대시보드</h2>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="fw-bold m-0">관리자 대시보드</h2>
          <div className="text-secondary small mt-1">{message || "ADMIN DASHBOARD OK"}</div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <button
            type="button"
            className="w-100 text-start border-0 shadow-sm rounded-4 p-4"
            style={{ backgroundColor: "#ecfdf5" }}
            onClick={() => navigate("/admin/userlist")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 52, height: 52, backgroundColor: "white" }}
              >
                <Users color="#059669" />
              </div>
              <div>
                <div className="fw-bold fs-4" style={{ color: "#059669" }}>
                  회원조회
                </div>
                <div className="text-secondary small mt-1">
                  회원 목록 검색
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="col-md-6">
          <button
            type="button"
            className="w-100 text-start border-0 shadow-sm rounded-4 p-4"
            style={{ backgroundColor: "#f8fafc" }}
            onClick={() => navigate("/admin/login_history")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 52, height: 52, backgroundColor: "white" }}
              >
                <ListChecks color="#059669" />
              </div>
              <div>
                <div className="fw-bold fs-4" style={{ color: "#059669" }}>
                  로그인 이력
                </div>
                <div className="text-secondary small mt-1">
                  기간 조회 
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* ✅ 추가: 체크리스트 관리 */}
        <div className="col-md-6">
          <button
            type="button"
            className="w-100 text-start border-0 shadow-sm rounded-4 p-4"
            style={{ backgroundColor: "#f8fafc" }}
            onClick={() => navigate("/admin/checklist")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 52, height: 52, backgroundColor: "white" }}
              >
                <ClipboardList color="#059669" />
              </div>
              <div>
                <div className="fw-bold fs-4" style={{ color: "#059669" }}>
                  체크리스트 관리
                </div>
                <div className="text-secondary small mt-1">
                  템플릿 / 항목 등록 · 수정 · 비활성화
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="col-md-6">
          <button
            type="button"
            className="w-100 text-start border-0 shadow-sm rounded-4 p-4"
            style={{ backgroundColor: "#f8fafc" }}
            onClick={() => navigate("/admin/chat")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 52, height: 52, backgroundColor: "white" }}
              >
                <MessageSquareText color="#059669" />
              </div>
              <div>
                <div className="fw-bold fs-4" style={{ color: "#059669" }}>
                  챗봇 대화 관리
                </div>
                <div className="text-secondary small mt-1">
                  사용자 대화 조회 / 삭제 / 복구
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="col-md-6">
          <button
            type="button"
            className="w-100 text-start border-0 shadow-sm rounded-4 p-4"
            style={{ backgroundColor: "#f8fafc" }}
            onClick={() => navigate("/admin/chatbotstats")}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center"
                style={{ width: 52, height: 52, backgroundColor: "white" }}
              >
                <BarChart3 color="#059669" />
              </div>
              <div>
                <div className="fw-bold fs-4" style={{ color: "#059669" }}>
                  챗봇 통계
                </div>
                <div className="text-secondary small mt-1">
                  사용량 · 피드백 · 차단 현황
                </div>
              </div>
            </div>
          </button>
        </div>


      </div>
    </div>
  );
};

export default AdminDashboard;
