import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Tool';
import './member_changepw.css';

const Member_ChangePw = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 🔥 FindPw에서 전달받은 값
  const { loginId, email, resetCode } = location.state || {};

  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [message, setMessage] = useState('');

  /* ===============================
     접근 차단 (직접 URL 접근 방지)
  =============================== */
  if (!loginId || !email || !resetCode) {
    return (
      <div className="changepw-wrapper">
        <div className="changepw-card">
          <h3 className="changepw-error-title">잘못된 접근입니다.</h3>
          <button
            className="changepw-btn"
            onClick={() => navigate('/login')}
          >
            로그인 페이지로
          </button>
        </div>
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
      await axiosInstance.post('/member/repassword/reset', {
        resetCode,
        newPassword: newPw,
        confirmPassword: newPwConfirm,
      });

      alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      setMessage(
        err.response?.data?.message || '비밀번호 변경에 실패했습니다.'
      );
    }
  };

  return (
    <div className="changepw-wrapper">
      <div className="changepw-card">
        <h2 className="changepw-title">비밀번호 재설정</h2>

        <input
          className="changepw-input"
          type="password"
          placeholder="새 비밀번호"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />

        <input
          className="changepw-input"
          type="password"
          placeholder="새 비밀번호 확인"
          value={newPwConfirm}
          onChange={(e) => setNewPwConfirm(e.target.value)}
        />

        <button className="changepw-btn" onClick={changePassword}>
          비밀번호 변경
        </button>

        {message && <p className="changepw-message">{message}</p>}
      </div>
    </div>
  );
};

export default Member_ChangePw;
