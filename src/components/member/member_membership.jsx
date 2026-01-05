import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Tool';
import './member_membership.css';

const Member_Membership = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    loginId: '',
    password: '',
    passwordConfirm: '',
    name: '',
    email: '',
    phone: '',
    emailCode: '',
  });

  const [idChecked, setIdChecked] = useState(false);
  const [idCheckMsg, setIdCheckMsg] = useState('');

  // 🔥 이메일 인증 상태
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');

  /* ===============================
     입력 핸들러
  =============================== */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });

    if (name === 'loginId') {
      setIdChecked(false);
      setIdCheckMsg('');
    }

    // 이메일 변경 시 인증 상태 초기화
    if (name === 'email') {
      setEmailSent(false);
      setEmailVerified(false);
      setEmailMsg('');
      setForm((prev) => ({ ...prev, emailCode: '' }));
    }
  };

  /* ===============================
     아이디 중복확인
  =============================== */
  const handleIdCheck = async () => {
    if (!form.loginId) {
      alert('아이디를 입력하세요.');
      return;
    }

    try {
      const res = await axiosInstance.get('/member/check_login_id', {
        params: { loginId: form.loginId },
      });

      if (res.data === 0) {
        setIdChecked(true);
        setIdCheckMsg('사용 가능한 아이디입니다.');
      } else {
        setIdChecked(false);
        setIdCheckMsg('이미 사용 중인 아이디입니다.');
      }
    } catch {
      alert('아이디 중복확인 중 오류 발생');
    }
  };

  /* ===============================
     이메일 인증번호 발송
  =============================== */
  const sendEmailCode = async () => {
    if (!form.email) {
      alert('이메일을 입력하세요.');
      return;
    }

    try {
      const res = await axiosInstance.post('/email/signup/send', {
        email: form.email,
      });

      if (res.data.success) {
        setEmailSent(true);
        setEmailMsg('인증번호가 이메일로 발송되었습니다.');
      } else {
        setEmailMsg(res.data.message);
      }
    } catch {
      setEmailMsg('인증번호 발송 실패');
    }
  };

  /* ===============================
     이메일 인증 확인
  =============================== */
  const verifyEmailCode = async () => {
    if (!form.emailCode) {
      alert('인증번호를 입력하세요.');
      return;
    }

    try {
      const res = await axiosInstance.post('/email/verify', {
        email: form.email,
        code: form.emailCode,
      });

      if (res.data.success) {
        setEmailVerified(true);
        setEmailMsg('이메일 인증이 완료되었습니다.');
      } else {
        setEmailMsg(res.data.message);
      }
    } catch {
      setEmailMsg('이메일 인증 실패');
    }
  };

  /* ===============================
     비밀번호 검증
  =============================== */
  const passwordMismatch =
    form.passwordConfirm &&
    form.password !== form.passwordConfirm;

  /* ===============================
     회원가입
  =============================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!idChecked) {
      alert('아이디 중복확인을 해주세요.');
      return;
    }

    if (!emailVerified) {
      alert('이메일 인증을 완료해주세요.');
      return;
    }

    if (passwordMismatch) {
      alert('비밀번호가 서로 다릅니다.');
      return;
    }

    try {
      const res = await axiosInstance.post('/member/save', {
        loginId: form.loginId,
        password: form.password,
        name: form.name,
        email: form.email,
        phone: form.phone,
      });

      if (res.data.success === false) {
        alert(res.data.message);
        return;
      }

      alert('회원가입이 완료되었습니다.');
      navigate('/login');
    } catch {
      alert('회원가입 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="membership-container">
      <form className="membership-box" onSubmit={handleSubmit}>
        <h2>회원가입</h2>

        {/* 아이디 */}
        <div className="input-group">
          <input
            type="text"
            name="loginId"
            placeholder="아이디"
            value={form.loginId}
            onChange={handleChange}
            disabled={idChecked}
          />
          <button type="button" onClick={handleIdCheck} disabled={idChecked}>
            중복확인
          </button>
        </div>
        {idCheckMsg && (
          <div className={idChecked ? 'success-text' : 'error-text'}>
            {idCheckMsg}
          </div>
        )}

        {/* 비밀번호 */}
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          value={form.password}
          onChange={handleChange}
        />

        <input
          type="password"
          name="passwordConfirm"
          placeholder="비밀번호 확인"
          value={form.passwordConfirm}
          onChange={handleChange}
        />
        {passwordMismatch && (
          <div className="error-text">비밀번호가 서로 다릅니다.</div>
        )}

        {/* 이름 */}
        <input
          type="text"
          name="name"
          placeholder="이름"
          value={form.name}
          onChange={handleChange}
        />

        {/* 이메일 인증 */}
        <div className="input-group">
          <input
            type="email"
            name="email"
            placeholder="이메일"
            value={form.email}
            onChange={handleChange}
            disabled={emailVerified}
          />
          <button
            type="button"
            onClick={sendEmailCode}
            disabled={emailVerified}
          >
            인증번호 받기
          </button>
        </div>

        {emailSent && (
          <div className="input-group">
            <input
              type="text"
              name="emailCode"
              placeholder="인증번호 입력"
              value={form.emailCode}
              onChange={handleChange}
              disabled={emailVerified}
            />
            <button
              type="button"
              onClick={verifyEmailCode}
              disabled={emailVerified}
            >
              인증하기
            </button>
          </div>
        )}

        {emailMsg && (
          <div className={emailVerified ? 'success-text' : 'error-text'}>
            {emailMsg}
          </div>
        )}

        {/* 전화번호 */}
        <input
          type="text"
          name="phone"
          placeholder="전화번호"
          value={form.phone}
          onChange={handleChange}
        />

        <button type="submit" disabled={!emailVerified}>
          회원가입
        </button>

        <div className="membership-footer">
          이미 계정이 있으신가요?{' '}
          <span onClick={() => navigate('/login')}>로그인</span>
        </div>
      </form>
    </div>
  );
};

export default Member_Membership;
