import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
      const res = await axios.post(
        'http://localhost:9093/member/find_id',
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
    <div className="container mt-5" style={{ maxWidth: '420px' }}>
      <h4 className="mb-4 text-center">아이디 찾기</h4>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">이름</label>
          <input
            type="text"
            name="name"
            className="form-control"
            value={form.name}
            onChange={handleChange}
            placeholder="이름 입력"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">이메일</label>
          <input
            type="email"
            name="email"
            className="form-control"
            value={form.email}
            onChange={handleChange}
            placeholder="가입한 이메일 입력"
          />
        </div>

        <button type="submit" className="btn btn-primary w-100">
          아이디 찾기
        </button>
      </form>

      <div className="text-center mt-3">
        <button
          className="btn btn-link p-0"
          onClick={() => navigate('/login')}
        >
          로그인 페이지로 이동
        </button>
      </div>
    </div>
  );
};

export default Member_FindId;
