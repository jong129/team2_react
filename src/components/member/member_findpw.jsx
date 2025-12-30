import React, { useState } from 'react';
import { axiosInstance } from '../Tool';

const Member_FindPw = () => {
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: 아이디+이메일, 2: 인증번호
  const [message, setMessage] = useState('');

  /* ===============================
     1️⃣ 비밀번호 재설정 인증번호 발송
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

      // 🔥 핵심: success 여부 반드시 확인
      if (res.data.success) {
        setMessage(res.data.message);
        setStep(2);
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
     2️⃣ 인증번호 검증
     =============================== */
  const verifyCode = async () => {
    setMessage('');

    if (!code) {
      setMessage('인증번호를 입력하세요.');
      return;
    }

    try {
      const res = await axiosInstance.post('/email/verify', {
        email,
        code,
      });

      if (res.data.success) {
        setMessage(res.data.message);

        // 🔥 다음 단계 (비밀번호 재설정 페이지로 이동 시 여기서 처리)
        // navigate('/member/reset_password', { state: { email, loginId } });
      } else {
        setMessage(res.data.message);
      }
    } catch (err) {
      setMessage(
        err.response?.data?.message || '인증번호가 올바르지 않습니다.'
      );
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>비밀번호 찾기</h2>

      {step === 1 && (
        <>
          <div>
            <input
              type="text"
              placeholder="아이디 입력"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </div>

          <div>
            <input
              type="email"
              placeholder="가입한 이메일 입력"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button onClick={sendResetCode}>
            인증번호 발송
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <input
              type="text"
              placeholder="인증번호 입력"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <button onClick={verifyCode}>
            인증번호 확인
          </button>
        </>
      )}

      {message && (
        <p style={{ marginTop: '10px', color: '#555' }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default Member_FindPw;
