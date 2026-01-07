import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../Tool';
import './member_findid.css';

const Member_FindId = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email) {
      alert('이름과 이메일을 모두 입력하세요.');
      return;
    }

    try {
      const res = await axiosInstance.post(
        '/member/find_id',
        null,
        {
          params: {
            name: form.name,
            email: form.email,
          },
        }
      );

      if (res.data.success) {
        alert(`아이디는 ${res.data.loginId} 입니다`);
      } else {
        alert(res.data.message);
      }

    } catch (err) {
      alert(
        err.response?.data?.message ||
        '아이디 찾기 중 오류가 발생했습니다.'
      );
    }
  };

  return (
    <div className="findid-wrapper">
      <div className="findid-card">
        <div className="findid-badge">계정 찾기</div>
        <h4 className="findid-title">아이디 찾기</h4>
        <p className="findid-subtitle">가입한 이메일로 아이디를 확인합니다.</p>

        <form onSubmit={handleSubmit}>
          <div className="findid-field">
            <label className="findid-label">이름</label>
            <input
              type="text"
              name="name"
              className="findid-input"
              value={form.name}
              onChange={handleChange}
              placeholder="이름 입력"
            />
          </div>

          <div className="findid-field">
            <label className="findid-label">이메일</label>
            <input
              type="email"
              name="email"
              className="findid-input"
              value={form.email}
              onChange={handleChange}
              placeholder="가입한 이메일 입력"
            />
          </div>

          <button type="submit" className="findid-btn">
            아이디 찾기
          </button>
        </form>

        <div className="findid-footer">
          <button
            className="findid-link"
            type="button"
            onClick={() => navigate('/login')}
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    </div>
  );
};

export default Member_FindId;
