import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import { KeyRound, ArrowRight, Scan, Mail } from "lucide-react";
import "./member_changepw.css";

const Member_ChangePw = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // FindPw(재설정)에서 전달받는 값
  const { loginId, email, resetCode } = location.state || {};

  // 모드 판별
  const isResetFlow = useMemo(() => !!(loginId && email && resetCode), [loginId, email, resetCode]);

  // mypage 모드에서 로그인 확인용
  const [mode, setMode] = useState("checking"); // checking | reset | mypage | blocked
  const [me, setMe] = useState(null);

  // 공통 입력
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [message, setMessage] = useState("");

  // mypage 모드용(인증번호)
  const [verifyCode, setVerifyCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // 1) reset 흐름이면 그대로 reset 모드
    if (isResetFlow) {
      setMode("reset");
      return;
    }

    // 2) reset 흐름이 아니면: 로그인 상태면 mypage 모드로, 아니면 blocked
    (async () => {
      try {
        const res = await axiosInstance.get("/mypage/me");
        setMe(res.data);
        setMode("mypage");
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        setMode("blocked");
      }
    })();
  }, [isResetFlow]);

  const validatePw = () => {
    const a = newPw;
    const b = newPwConfirm;

    if (!a || !b) {
      setMessage("비밀번호를 모두 입력하세요.");
      return false;
    }
    if (a !== b) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return false;
    }
    return true;
  };

  /* ===============================
     reset 모드: 비밀번호 재설정
  =============================== */
  const changePasswordByReset = async () => {
    setMessage("");

    if (!validatePw()) return;

    try {
      await axiosInstance.post("/member/repassword/reset", {
        resetCode,
        newPassword: newPw,
        confirmPassword: newPwConfirm,
      });

      alert("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      navigate("/login", { replace: true });
    } catch (err) {
      setMessage(err.response?.data?.message || "비밀번호 변경에 실패했습니다.");
    }
  };

  /* ===============================
     mypage 모드: 인증번호 발송
  =============================== */
  const sendMypageCode = async () => {
    setMessage("");
    setSending(true);

    try {
      await axiosInstance.post("/mypage/password/send");
      setCodeSent(true);
      setMessage("인증번호가 이메일로 발송되었습니다.");
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setMessage("로그인이 필요합니다.");
      else setMessage(err.response?.data?.message || "인증번호 발송 실패");
    } finally {
      setSending(false);
    }
  };

  /* ===============================
     mypage 모드: 인증번호 검증 + 비번 변경
  =============================== */
  const changePasswordByMypage = async () => {
    setMessage("");

    const code = verifyCode.trim();
    if (!code) {
      setMessage("인증번호를 입력하세요.");
      return;
    }
    if (!validatePw()) return;

    try {
      await axiosInstance.post("/mypage/password/change", {
        verifyCode: code,
        newPassword: newPw,
        confirmPassword: newPwConfirm,
      });

      alert("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      navigate("/login", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setMessage("로그인이 필요합니다.");
      else setMessage(err.response?.data?.message || "비밀번호 변경 실패");
    }

  };

  /* ===============================
     blocked UI
  =============================== */
  const Blocked = () => (
    <div className="hs-page">
      <div className="hs-container">
        <div className="hs-center">
          <div className="hs-card">
            <div className="hs-brand">
              <Scan size={22} className="hs-brand-icon" />
              <span className="hs-brand-text">홈스캐너</span>
            </div>

            <h3 className="hs-error-title">잘못된 접근입니다.</h3>
            <p className="hs-subtext">
              비밀번호 재설정 흐름 또는 로그인 상태에서만 접근할 수 있습니다. 로그인 페이지로 이동해 주세요.
            </p>

            <div className="hs-actions">
              <button className="hs-btn hs-btn-primary" onClick={() => navigate("/login")}>
                로그인 페이지로 <ArrowRight size={18} className="hs-btn-icon" />
              </button>
            </div>
          </div>

          <div className="hs-footnote">보안을 위해 직접 URL 접근은 차단됩니다.</div>
        </div>
      </div>
    </div>
  );

  if (mode === "checking") {
    return (
      <div className="hs-page">
        <div className="hs-container">
          <div className="hs-center">
            <div className="hs-card">
              <div className="text-secondary">로딩중...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "blocked") return <Blocked />;

  /* ===============================
     화면 렌더 (reset / mypage)
  =============================== */
  const title = mode === "reset" ? "비밀번호 재설정" : "비밀번호 변경";
  const subtitle =
    mode === "reset"
      ? "새 비밀번호를 설정한 뒤 다시 로그인하세요."
      : "이메일 인증번호로 본인 확인 후 비밀번호를 변경합니다.";

  return (
    <div className="hs-page">
      <section className="hs-hero">
        <div className="hs-hero-bg" />

        <div className="hs-container hs-hero-content">
          <div className="hs-center">
            <div className="hs-card">
              {/* 헤더 */}
              <div className="hs-title-row">
                <div className="hs-icon-badge">
                  <KeyRound size={22} />
                </div>

                <div>
                  <div className="hs-title">{title}</div>
                  <div className="hs-subtext">{subtitle}</div>
                </div>
              </div>

              {/* 안내 */}
              {mode === "reset" && (
                <div className="hs-info-box">
                  <div className="hs-info-label">대상 계정</div>
                  <div className="hs-info-strong">{loginId}</div>
                  <div className="hs-info-email">{email}</div>
                </div>
              )}

              {mode === "mypage" && (
                <div className="hs-info-box">
                  <div className="hs-info-label">로그인 계정</div>
                  <div className="hs-info-strong">{me?.loginId}</div>
                  <div className="hs-info-email">{me?.email}</div>
                </div>
              )}

              {/* mypage: 인증번호 발송/입력 */}
              {mode === "mypage" && (
                <>
                  <div className="hs-field">
                    <label className="hs-label">이메일 인증</label>

                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="hs-input"
                        type="text"
                        placeholder="인증번호 6자리"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        style={{ flex: 1 }}
                        disabled={!codeSent}
                      />
                      <button
                        className="hs-btn hs-btn-outline"
                        onClick={sendMypageCode}
                        disabled={sending}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        <Mail size={18} className="hs-btn-icon" />
                        {codeSent ? "재발송" : "발송"}
                      </button>
                    </div>

                    {!codeSent && (
                      <div className="hs-subtext" style={{ marginTop: 8 }}>
                        먼저 인증번호를 발송하세요.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* 입력 폼 */}
              <div className="hs-field">
                <label className="hs-label">새 비밀번호</label>
                <input
                  className="hs-input"
                  type="password"
                  placeholder="새 비밀번호"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>

              <div className="hs-field">
                <label className="hs-label">새 비밀번호 확인</label>
                <input
                  className="hs-input"
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={newPwConfirm}
                  onChange={(e) => setNewPwConfirm(e.target.value)}
                />
              </div>

              {/* 에러 메시지 */}
              {message && <div className="hs-alert hs-alert-danger">{message}</div>}

              {/* 버튼 */}
              <div className="hs-actions hs-actions-gap">
                {mode === "reset" ? (
                  <button className="hs-btn hs-btn-primary" onClick={changePasswordByReset}>
                    비밀번호 변경 <ArrowRight size={18} className="hs-btn-icon" />
                  </button>
                ) : (
                  <button
                    className="hs-btn hs-btn-primary"
                    onClick={changePasswordByMypage}
                    disabled={!codeSent}
                    title={!codeSent ? "인증번호 발송 후 진행하세요." : ""}
                  >
                    비밀번호 변경 <ArrowRight size={18} className="hs-btn-icon" />
                  </button>
                )}

                <button
                  className="hs-btn hs-btn-outline"
                  onClick={() => navigate(mode === "mypage" ? "/member/mypage" : "/login")}
                >
                  {mode === "mypage" ? "마이페이지로" : "로그인으로 돌아가기"}
                </button>
              </div>
            </div>

            <div className="hs-footnote">
              비밀번호 변경 후 기존 세션이 만료될 수 있습니다.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Member_ChangePw;
