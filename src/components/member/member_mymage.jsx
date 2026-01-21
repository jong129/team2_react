import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import {
  User,
  Settings,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  MessageSquareText,
  ArrowLeft,
} from "lucide-react";

const Member_Mypage = () => {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await axiosInstance.get("/mypage/me");
      setMe(res.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setError("로그인이 필요합니다.");
      else if (status === 403) setError("접근 권한이 없습니다.");
      else setError("내 정보 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  return (
    <div className="bg-white" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="container py-5" style={{ maxWidth: 980 }}>
        {/* 상단 헤더 */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            {/* ✅ 뒤로가기(무조건 홈) */}
            <button
              type="button"
              className="btn btn-light rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40 }}
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="fw-bold" style={{ color: "#059669" }}>
                <User className="me-2" size={20} />
                마이페이지
              </div>
              <h2 className="fw-extrabold mb-0">내 정보 / 설정</h2>
              <div className="text-secondary small mt-1">
                계정 정보 확인 및 개인 설정을 관리합니다.
              </div>
            </div>
          </div>

          <button
            className="btn btn-outline-emerald rounded-pill px-4 fw-bold"
            onClick={loadMe}
          >
            <RefreshCw size={18} className="me-2" />
            새로고침
          </button>
        </div>

        {/* 네비 버튼 바 */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <button
            className="btn btn-emerald rounded-pill px-4 fw-bold text-white"
            onClick={() => navigate("/member/mypage")}
          >
            내 정보
          </button>

          <button
            className="btn btn-outline-emerald rounded-pill px-4 fw-bold"
            onClick={() => navigate("/member/mypage/update")}
          >
            <Settings size={18} className="me-2" />
            프로필 수정 / 회원탈퇴
          </button>

          <button
            className="btn btn-outline-emerald rounded-pill px-4 fw-bold"
            onClick={() => navigate("/member_changepw")}
          >
            <KeyRound size={18} className="me-2" />
            비밀번호 변경
          </button>

          {/* ✅ 추가: 1:1 문의 */}
          <button
            className="btn btn-outline-emerald rounded-pill px-4 fw-bold"
            onClick={() => navigate("/member/inquiries")}
          >
            <MessageSquareText size={18} className="me-2" />
            1:1 문의
          </button>
        </div>

        {/* 상태 메시지 */}
        {loading && (
          <div className="card border-0 shadow-sm rounded-5 p-4">
            <div className="text-secondary">로딩중...</div>
          </div>
        )}

        {error && <div className="alert alert-danger rounded-4 shadow-sm">{error}</div>}

        {/* 본문 */}
        {!loading && me && (
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm rounded-5 p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="fw-bold mb-0">
                    <ShieldCheck
                      size={20}
                      className="me-2"
                      style={{ color: "#059669" }}
                    />
                    내 계정 정보
                  </h5>
                </div>

                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <tbody>
                      <tr>
                        <th className="text-secondary" style={{ width: 180 }}>
                          회원번호
                        </th>
                        <td className="fw-semibold">{me.memberId}</td>
                      </tr>
                      <tr>
                        <th className="text-secondary">아이디</th>
                        <td className="fw-semibold">{me.loginId}</td>
                      </tr>
                      <tr>
                        <th className="text-secondary">이메일</th>
                        <td className="fw-semibold">{me.email}</td>
                      </tr>
                      <tr>
                        <th className="text-secondary">이름</th>
                        <td className="fw-semibold">{me.name}</td>
                      </tr>
                      <tr>
                        <th className="text-secondary">전화</th>
                        <td className="fw-semibold">{me.phone || "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-5 p-4">
                <h5 className="fw-bold mb-2">바로가기</h5>
                <div className="text-secondary small mb-3">
                  자주 쓰는 메뉴를 빠르게 이동할 수 있습니다.
                </div>

                <div className="d-grid gap-2">
                  <button
                    className="btn btn-outline-emerald rounded-pill fw-bold"
                    onClick={() => navigate("/member/mypage/update")}
                  >
                    프로필 수정 / 회원탈퇴
                  </button>

                  <button
                    className="btn btn-outline-emerald rounded-pill fw-bold"
                    onClick={() => navigate("/member_changepw")}
                  >
                    비밀번호 변경
                  </button>

                  {/* ✅ 추가: 1:1 문의 */}
                  <button
                    className="btn btn-outline-emerald rounded-pill fw-bold"
                    onClick={() => navigate("/member/inquiries")}
                  >
                    1:1 문의
                  </button>
                </div>
              </div>

              <div
                className="card border-0 shadow-sm rounded-5 p-4 mt-4"
                style={{ backgroundColor: "#f0fdf4" }}
              >
                <div className="fw-bold mb-1" style={{ color: "#059669" }}>
                  안내
                </div>
                <div className="text-secondary small">미기입</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Home.jsx 톤의 전역 버튼 CSS 재사용 */}
      <style>{`
        .btn-emerald { background-color: #059669; border: none; transition: all 0.3s; }
        .btn-emerald:hover { background-color: #047857; transform: translateY(-2px); }
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.3s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
      `}</style>
    </div>
  );
};

export default Member_Mypage;
