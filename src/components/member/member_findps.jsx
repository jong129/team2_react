import React, { useState } from 'react';
import { API } from '../Tool'; // axiosInstance 또는 API 경로 맞게 수정

const Member_FindPs = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: 이메일 입력, 2: 인증번호 입력
  const [message, setMessage] = useState('');

  /* ===============================
     1️⃣ 비밀번호 재설정 인증번호 발송
     =============================== */
  const sendResetCode = async () => {
    try {
      await API.post('/email/password/send', { email });
      setMessage('인증번호가 이메일로 발송되었습니다.');
      setStep(2);
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
    try {
      await API.post('/email/verify', {
        email,
        code,
      });

      setMessage('이메일 인증이 완료되었습니다.');
      // 👉 다음 단계:
      // navigate('/member/reset_password', { state: { email } });
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

export default Member_FindPs;
