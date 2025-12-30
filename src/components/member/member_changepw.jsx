import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Tool';

const Member_ChangePw = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 🔥 FindPw에서 전달받은 값
  const { loginId, email } = location.state || {};

  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [message, setMessage] = useState('');

  /* ===============================
     접근 차단 (직접 URL 접근 방지)
  =============================== */
  if (!loginId || !email) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h3>잘못된 접근입니다.</h3>
        <button onClick={() => navigate('/login')}>로그인 페이지로</button>
      </div>
    );
  }

  /* ===============================
     비밀번호 변경
  =============================== */
  const changePassword = async () => {
    setMessage('');

    if (!newPw || !newPwConfirm) {
      setMessage('비밀번호를 모두 입력하세요.');
      return;
    }

    if (newPw !== newPwConfirm) {
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const res = await axiosInstance.put('/member/change_pw', {
        loginId,
        email,
        newPassword: newPw,
      });

      if (res.data.success) {
        alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
        navigate('/login');
      } else {
        setMessage(res.data.message);
      }
    } catch (err) {
      setMessage(
        err.response?.data?.message || '비밀번호 변경에 실패했습니다.'
      );
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>비밀번호 재설정</h2>

      <div>
        <input
          type="password"
          placeholder="새 비밀번호"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
      </div>

      <div>
        <input
          type="password"
          placeholder="새 비밀번호 확인"
          value={newPwConfirm}
          onChange={(e) => setNewPwConfirm(e.target.value)}
        />
      </div>

      <button onClick={changePassword}>
        비밀번호 변경
      </button>

      {message && (
        <p style={{ marginTop: '10px', color: '#555' }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default Member_ChangePw;
