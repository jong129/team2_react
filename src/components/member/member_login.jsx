import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './member_login.css';

const API = axios.create({
  baseURL: 'http://localhost:9093',
});

const Member_Login = () => {
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  // 체크박스 상태
  const [saveId, setSaveId] = useState(false);
  const [savePassword, setSavePassword] = useState(false);

  /* ==================================================
     1️⃣ 최초 로딩 시
        - 로그인 유지 체크
        - 저장된 아이디/비밀번호 불러오기
  ================================================== */
  useEffect(() => {
    // 🔐 로그인 유지 확인
    const loginMemberId = localStorage.getItem('loginMemberId');
    if (loginMemberId) {
      // 이미 로그인 상태면 로그인 페이지 접근 차단
      navigate('/');
      return;
    }

    // 아이디 / 비밀번호 저장 불러오기
    const savedId = localStorage.getItem('savedLoginId');
    const savedPw = localStorage.getItem('savedPassword');

    if (savedId) {
      setLoginId(savedId);
      setSaveId(true);
    }

    if (savedPw) {
      setPassword(savedPw);
      setSavePassword(true);
    }
  }, [navigate]);

  /* ==================================================
     2️⃣ 실제 로그인 처리 (DB 연동)
  ================================================== */
  const doLogin = async (id, pw) => {
    try {
      const res = await API.post(
        '/member/login',
        null,
        {
          params: {
            loginInput: id,
            password: pw,
          },
        }
      );

      const { cnt, memberId, loginId: serverLoginId } = res.data;

      switch (cnt) {
        case 0:
          alert('아이디 또는 이메일이 존재하지 않습니다.');
          return;

        case 2:
          alert('비밀번호가 올바르지 않습니다.');
          return;

        case 3:
          alert('계정이 잠겨 있습니다.');
          return;

        case 1:
          // ✅ 로그인 성공

          // 🔐 로그인 유지 정보 저장
          localStorage.setItem('loginMemberId', memberId);
          localStorage.setItem('loginLoginId', serverLoginId);

          // 아이디 저장
          if (saveId) {
            localStorage.setItem('savedLoginId', id);
          } else {
            localStorage.removeItem('savedLoginId');
          }

          // 비밀번호 저장
          if (savePassword) {
            localStorage.setItem('savedPassword', pw);
          } else {
            localStorage.removeItem('savedPassword');
          }

          alert('로그인 성공');
          navigate('/');
          return;

        default:
          alert('알 수 없는 로그인 오류');
      }
    } catch (e) {
      console.error(e);
      alert('서버 오류로 로그인에 실패했습니다.');
    }
  };

  /* ==================================================
     3️⃣ 일반 로그인 버튼
  ================================================== */
  const handleLogin = (e) => {
    e.preventDefault();

    if (!loginId || !password) {
      alert('아이디와 비밀번호를 입력하세요.');
      return;
    }

    doLogin(loginId, password);
  };

  /* ==================================================
     4️⃣ 테스트 로그인
  ================================================== */
  const handleTestLogin = () => {
    const testId = 'test1';
    const testPw = '1234';

    setLoginId(testId);
    setPassword(testPw);

    setTimeout(() => {
      doLogin(testId, testPw);
    }, 0);
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleLogin}>
        <h2>로그인</h2>

        <input
          type="text"
          placeholder="아이디"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* 아이디 / 비밀번호 저장 */}
        <div className="login-options">
          <label>
            <input
              type="checkbox"
              checked={saveId}
              onChange={(e) => setSaveId(e.target.checked)}
            />
            아이디 저장
          </label>

          <label>
            <input
              type="checkbox"
              checked={savePassword}
              onChange={(e) => setSavePassword(e.target.checked)}
            />
            비밀번호 저장
          </label>
        </div>

        {/* 로그인 / 테스트 로그인 */}
        <div className="login-button-row">
          <button type="submit" className="login-btn">
            로그인
          </button>

          <button
            type="button"
            className="test-btn"
            onClick={handleTestLogin}
          >
            테스트 로그인
          </button>
        </div>

        <div className="login-links">
          <span onClick={() => navigate('/member_findid')}>아이디 찾기</span>
          <span>|</span>
          <span onClick={() => navigate('/member_findpw')}>비밀번호 찾기</span>
          <span>|</span>
          <Link to="/member_membership">회원가입</Link>
        </div>
      </form>
    </div>
  );
};

export default Member_Login;
