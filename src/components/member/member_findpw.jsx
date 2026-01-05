import React, { useState } from 'react';
import { axiosInstance } from '../Tool';
import { useNavigate } from 'react-router-dom';
import './member_findpw.css';

const Member_FindPw = () => {
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  /* ===============================
     1️⃣ 인증번호 발송
  =============================== */
  const sendResetCode = async () => {
    setMessage('');

    if (!loginId || !email) {
      setMessage('아이디와 이메일을 모두 입력하세요.');
      return;
    }

    try {
      const res = await axiosInstance.post('/email/password/send', {
        loginId,
        email,
      });

      if (res.data.success) {
        setStep(2);
        setMessage(res.data.message);
      } else {
        setMessage(res.data.message);
      }
    } catch (err) {
      setMessage(
        err.response?.data?.message || '인증번호 발송에 실패했습니다.'
      );
    }
  };

  /* ===============================
     2️⃣ 인증번호 검증 + resetCode 발급
  =============================== */
  const verifyCode = async () => {
    setMessage('');

    if (!code) {
      setMessage('인증번호를 입력하세요.');
      return;
    }

    try {
      const verifyRes = await axiosInstance.post('/email/verify', {
        email,
        code,
      });

      if (!verifyRes.data.success) {
        setMessage(verifyRes.data.message);
        return;
      }

      const tokenRes = await axiosInstance.post(
        '/member/repassword/token',
        {
          loginId,
          email,
        }
      );

      const resetCode = tokenRes.data.resetCode;

      navigate('/member_changepw', {
        state: { loginId, email, resetCode },
      });
    } catch (err) {
      setMessage(
        err.response?.data?.message || '인증 처리 중 오류가 발생했습니다.'
      );
    }
  };

  return (
    <div className="findpw-wrapper">
      <div className="findpw-card">
        <h2 className="findpw-title">
          {step === 1 ? '비밀번호 찾기' : '인증번호 확인'}
        </h2>

        {step === 1 && (
          <>
            <input
              className="findpw-input"
              type="text"
              placeholder="아이디 입력"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />

            <input
              className="findpw-input"
              type="email"
              placeholder="가입한 이메일 입력"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button className="findpw-btn" onClick={sendResetCode}>
              인증번호 발송
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <input
              className="findpw-input"
              type="text"
              placeholder="인증번호 입력"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <button className="findpw-btn" onClick={verifyCode}>
              인증번호 확인
            </button>
          </>
        )}

        {message && <p className="findpw-message">{message}</p>}
      </div>
    </div>
  );
};

export default Member_FindPw;
