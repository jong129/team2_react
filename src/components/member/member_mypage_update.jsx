import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import {
  Settings,
  KeyRound,
  User,
  AlertTriangle,
  Save,
  Phone,
} from "lucide-react";

const Member_Mypage_Update = () => {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [withdrawPw, setWithdrawPw] = useState("");
  const [reason, setReason] = useState("");

  const loadMe = async () => {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await axiosInstance.get("/mypage/me");
      setMe(res.data);
      setName(res.data?.name || "");
      setPhone(res.data?.phone || "");
    } catch (e) {
      const status = e.response?.status;
      if (status === 401) setErr("로그인이 필요합니다.");
      else setErr("내 정보 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const handleUpdateName = async () => {
    setErr("");
    setMsg("");

    const v = name.trim();
    if (!v) {
      setErr("이름을 입력하세요.");
      return;
    }

    try {
      await axiosInstance.put("/mypage/profile/name", { name: v });
      setMsg("이름이 변경되었습니다.");
      await loadMe();
    } catch (e) {
      const status = e.response?.status;
      if (status === 401) setErr("로그인이 필요합니다.");
      else setErr(e.response?.data?.message || "이름 변경 실패");
    }
  };

  const handleUpdatePhone = async () => {
    setErr("");
    setMsg("");

    const v = phone.trim();
    if (!v) {
      setErr("전화번호를 입력하세요.");
      return;
    }

    try {
      await axiosInstance.put("/mypage/profile/phone", { phone: v });
      setMsg("전화번호가 변경되었습니다.");
      await loadMe();
    } catch (e) {
      const status = e.response?.status;
      if (status === 401) setErr("로그인이 필요합니다.");
      else setErr(e.response?.data?.message || "전화번호 변경 실패");
    }
  };

  const handleWithdraw = async () => {
    setErr("");
    setMsg("");

    if (!withdrawPw) {
      setErr("탈퇴를 위해 비밀번호를 입력하세요.");
      return;
    }

    const ok = window.confirm("정말 회원탈퇴 하시겠습니까? (탈퇴 후 복구 불가)");
    if (!ok) return;

    try {
      await axiosInstance.post("/mypage/withdraw", {
        password: withdrawPw,
        reason: reason?.trim() || null,
      });

      setMsg("회원탈퇴가 완료되었습니다.");
      navigate("/login");
    } catch (e) {
      const status = e.response?.status;
      if (status === 401) setErr("로그인이 필요합니다.");
      else setErr(e.response?.data?.message || "회원탈퇴 실패");
    }
  };

  return (
    <div className="bg-white" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="container py-5" style={{ maxWidth: 980 }}>
        {/* 헤더 */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <div className="fw-bold" style={{ color: "#059669" }}>
              <Settings className="me-2" size={20} />
              프로필 수정
            </div>
            <h2 className="fw-extrabold mb-0">이름 변경 / 전화번호 변경 / 회원탈퇴</h2>
            <div className="text-secondary small mt-1">
              필수 정보만 안전하게 변경할 수 있습니다.
            </div>
          </div>
        </div>

        {/* 네비 버튼 */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <button
            className="btn btn-outline-emerald rounded-pill px-4 fw-bold"
            onClick={() => navigate("/member/mypage")}
          >
            <User size={18} className="me-2" />
            마이페이지
          </button>

          <button
            className="btn btn-outline-emerald rounded-pill px-4 fw-bold"
            onClick={() => navigate("/member_changepw")}
          >
            <KeyRound size={18} className="me-2" />
            비밀번호 변경
          </button>
        </div>

        {/* 메시지 */}
        {err && <div className="alert alert-danger rounded-4 shadow-sm">{err}</div>}
        {msg && <div className="alert alert-success rounded-4 shadow-sm">{msg}</div>}

        {loading && (
          <div className="card border-0 shadow-sm rounded-5 p-4">
            <div className="text-secondary">로딩중...</div>
          </div>
        )}

        {!loading && me && (
          <div className="row g-4">
            {/* 기본 정보 카드 */}
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-5 p-4">
                <h5 className="fw-bold mb-3">내 정보</h5>

                <div className="mb-2">
                  <span className="text-secondary">아이디</span>{" "}
                  <span className="fw-semibold ms-2">{me.loginId}</span>
                </div>
                <div className="mb-2">
                  <span className="text-secondary">이메일</span>{" "}
                  <span className="fw-semibold ms-2">{me.email}</span>
                </div>
                <div className="mb-2">
                  <span className="text-secondary">전화번호</span>{" "}
                  <span className="fw-semibold ms-2">{me.phone}</span>
                </div>
              </div>
            </div>

            {/* 수정 카드들 */}
            <div className="col-lg-7">
              {/* 이름 변경 카드 */}
              <div className="card border-0 shadow-sm rounded-5 p-4">
                <h5 className="fw-bold mb-3">이름 변경</h5>

                <div className="row g-2 align-items-center">
                  <div className="col-md-8">
                    <input
                      type="text"
                      className="form-control rounded-pill px-3 py-2"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="이름"
                    />
                  </div>
                  <div className="col-md-4 d-grid">
                    <button
                      className="btn btn-emerald rounded-pill fw-bold text-white"
                      onClick={handleUpdateName}
                    >
                      <Save size={18} className="me-2" />
                      저장
                    </button>
                  </div>
                </div>
              </div>

              {/* 전화번호 변경 카드 */}
              <div className="card border-0 shadow-sm rounded-5 p-4 mt-4">
                <div className="d-flex align-items-center mb-3">
                  <Phone size={18} className="me-2" style={{ color: "#059669" }} />
                  <h5 className="fw-bold mb-0">전화번호 변경</h5>
                </div>

                <div className="row g-2 align-items-center">
                  <div className="col-md-8">
                    <input
                      type="text"
                      className="form-control rounded-pill px-3 py-2"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="전화번호"
                    />
                  </div>
                  <div className="col-md-4 d-grid">
                    <button
                      className="btn btn-emerald rounded-pill fw-bold text-white"
                      onClick={handleUpdatePhone}
                    >
                      <Save size={18} className="me-2" />
                      저장
                    </button>
                  </div>
                </div>
              </div>

              {/* 회원탈퇴 카드 */}
              <div
                className="card border-0 shadow-sm rounded-5 p-4 mt-4"
                style={{ border: "1px solid #fecaca" }}
              >
                <div className="d-flex align-items-center mb-2">
                  <AlertTriangle
                    size={20}
                    className="me-2"
                    style={{ color: "#dc2626" }}
                  />
                  <h5 className="fw-bold mb-0" style={{ color: "#dc2626" }}>
                    회원탈퇴
                  </h5>
                </div>

                <div className="text-secondary small mb-3">
                  복구는 관리자 정책에 따릅니다.
                </div>

                <div className="row g-2">
                  <div className="col-md-6">
                    <input
                      type="password"
                      className="form-control rounded-pill px-3 py-2"
                      value={withdrawPw}
                      onChange={(e) => setWithdrawPw(e.target.value)}
                      placeholder="비밀번호 확인"
                    />
                  </div>
                  <div className="col-md-6">
                    <select
                      className="form-select rounded-pill px-3 py-2"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      <option value="">탈퇴 사유(선택)</option>
                      <option value="문제 해결">1. 문제 해결</option>
                      <option value="서비스 이용 빈도 낮음">2. 서비스 이용 빈도 낮음</option>
                      <option value="기타">3. 기타</option>
                    </select>
                  </div>
                  <div className="col-12 d-grid mt-2">
                    <button
                      className="btn rounded-pill fw-bold text-white"
                      style={{ backgroundColor: "#dc2626", border: "none" }}
                      onClick={handleWithdraw}
                    >
                      회원탈퇴
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .btn-emerald { background-color: #059669; border: none; transition: all 0.3s; }
        .btn-emerald:hover { background-color: #047857; transform: translateY(-2px); }
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.3s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
      `}</style>
    </div>
  );
};

export default Member_Mypage_Update;
