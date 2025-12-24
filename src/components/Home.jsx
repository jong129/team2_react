import React, { useState } from 'react';
import { Camera, ClipboardCheck, MessageSquareText, ShieldAlert, CheckCircle2, Scan, User, ArrowRight, Menu, X, LogIn, LogOut, FileSearch } from 'lucide-react';

const Home = () => {
  // 로그인 상태 관리 (테스트를 위해 기본값 false)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
a
  // 로그인이 필요한 기능 클릭 시 처리 함수
  const handleProtectedAction = (e, actionName) => {
    if (!isLoggedIn) {
      e.preventDefault();
      alert(`'${actionName}' 기능은 로그인이 필요합니다. 로그인 페이지로 이동합니다.`);
      // window.location.href = "/login"; 
    }
  };

  return (
    <div className="bg-white overflow-hidden" style={{ fontFamily: "'Pretendard', sans-serif" }}>

      {/* 1. Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top py-3 shadow-sm">
        <div className="container">
          <a className="navbar-brand fw-bolder fs-3 d-flex align-items-center" href="#" style={{ color: '#059669' }}>
            <Scan className="me-2" /> 홈스캐너
          </a>

          {/* 모바일용 햄버거 버튼 - offcanvas 타겟팅 */}
          <button
            className="navbar-toggler border-0 p-0"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#mobileSidebar"
          >
            <Menu size={28} color="#059669" />
          </button>

          {/* 데스크탑 메뉴 (기존 d-none d-lg-block 유지) */}
          <div className="collapse navbar-collapse d-none d-lg-block">
            <ul className="navbar-nav ms-auto me-3 fw-semibold">
              <li className="nav-item"><a className="nav-link mx-2" href="#features">기능 소개</a></li>
              <li className="nav-item"><a className="nav-link mx-2" href="#analysis">문서 분석</a></li>
              <li className="nav-item"><a className="nav-link mx-2" href="#aibot">AI 비서</a></li>
              <li className="nav-item"><a className="nav-link mx-2" href="#checklist">체크리스트</a></li>
            </ul>
            <div className="d-flex align-items-center gap-2">
              {isLoggedIn ? (
                <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => setIsLoggedIn(false)}>로그아웃</button>
              ) : (
                <a href="/login" className="btn btn-emerald rounded-pill px-4 fw-bold text-white btn-sm">로그인</a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. 모바일 전용 사이드바 (Offcanvas) */}
      <div className="offcanvas offcanvas-end" tabIndex="-1" id="mobileSidebar" aria-labelledby="mobileSidebarLabel">
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold" id="mobileSidebarLabel" style={{ color: '#059669' }}>
            <Scan className="me-2" /> 메뉴
          </h5>
          <button type="button" className="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>

        <div className="offcanvas-body d-flex flex-column">
          {/* 로그인 상태 섹션 */}
          <div className="p-4 rounded-4 mb-4" style={{ backgroundColor: '#f0fdf4' }}>
            {isLoggedIn ? (
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="d-block small text-secondary">반가워요!</span>
                  <span className="fw-bold fs-5">사용자님</span>
                </div>
                <button className="btn btn-sm btn-link text-danger text-decoration-none p-0" onClick={() => setIsLoggedIn(false)}>로그아웃</button>
              </div>
            ) : (
              <div className="text-center">
                <p className="small text-secondary mb-3">로그인하고 안전하게 분석하세요</p>
                <a href="/login" className="btn btn-emerald w-100 rounded-pill fw-bold text-white mb-2">로그인</a>
                <a href="/signup" className="btn btn-outline-emerald w-100 rounded-pill fw-bold">회원가입</a>
              </div>
            )}
          </div>

          {/* 주요 기능 리스트 */}
          <ul className="list-unstyled flex-grow-1">
            <li className="mb-3">
              <a href="#features" className="d-flex align-items-center text-decoration-none text-dark fw-bold fs-5 p-2" data-bs-dismiss="offcanvas">
                <ShieldAlert className="me-3" color="#059669" /> 기능 소개
              </a>
            </li>
            <li className="mb-3">
              <a href="#analysis" className="d-flex align-items-center text-decoration-none text-dark fw-bold fs-5 p-2" data-bs-dismiss="offcanvas">
                <FileSearch className="me-3" color="#059669" /> 문서 분석
              </a>
            </li>
            <li className="mb-3">
              <a href="#aibot" className="d-flex align-items-center text-decoration-none text-dark fw-bold fs-5 p-2" data-bs-dismiss="offcanvas">
                <MessageSquareText className="me-3" color="#059669" /> AI 비서 대화
              </a>
            </li>
            <li className="mb-3">
              <a href="#checklist" className="d-flex align-items-center text-decoration-none text-dark fw-bold fs-5 p-2" data-bs-dismiss="offcanvas">
                <ClipboardCheck className="me-3" color="#059669" /> 체크리스트
              </a>
            </li>
            {isLoggedIn && (
              <li className="mt-2 pt-3 border-top">
                <a href="/mypage" className="d-flex align-items-center text-decoration-none text-primary fw-bold fs-5 p-2" data-bs-dismiss="offcanvas">
                  <User className="me-3" /> 마이페이지 / 이력관리
                </a>
              </li>
            )}
          </ul>

          {/* 하단 정보 */}
          <div className="mt-auto text-center py-3 border-top">
            <p className="text-muted small mb-0">© 2025 홈스캐너</p>
          </div>
        </div>
      </div>


      {/* 2. Hero Section */}
      <section className="py-5 position-relative" style={{ backgroundColor: '#f8fafc' }}>
        <div className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backgroundColor: '#ecfdf5',
            clipPath: 'polygon(0px 0px, 100% 0px, 100% 80%, 0% 100%)',
            zIndex: 0
          }}>
        </div>

        <div className="container py-5 text-center position-relative" style={{ zIndex: 1 }}>
          <span className="d-inline-block py-1 px-3 rounded-pill bg-white fw-bold shadow-sm mb-4 border" style={{ color: '#059669', borderColor: '#d1fae5' }}>
            📸 부동산 서류, 이제 읽지 말고 찍으세요!
          </span>
          <h1 className="display-4 fw-extrabold mb-4 lh-base text-dark">
            계약서, 등기부등본 찍는 순간<br />
            <span
              style={{
                color: '#dc2626',            // 빨간색
                fontSize: '1.3em',           // 글자 크기 증가
                fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
                borderBottom: '4px solid #dc2626', // 얇고 부드러운 라인
              }}
            >
              AI가 숨은 위험
            </span>
            을 찾아냅니다.
          </h1>

          <p className="lead text-secondary mb-5 mx-auto fw-medium" style={{ maxWidth: '600px' }}>
            부동산 사무실에서 바로 확인하세요.<br />
            어려운 법률 용어와 특약 사항을 인공지능이 즉시 분석해 드립니다.
          </p>

          <div className="d-flex justify-content-center">
            <button
              onClick={(e) => handleProtectedAction(e, '문서 촬영 분석')}
              className="btn btn-emerald btn-lg rounded-pill px-5 py-4 fw-bolder shadow-lg d-flex align-items-center hover-scale fs-4 text-white">
              <Camera size={32} className="me-3" /> 문서 촬영하고 분석 시작
            </button>
          </div>
          <p className="text-muted small mt-3">지원 문서: 등기부등본, 임대차계약서, 건축물대장</p>
        </div>
      </section>

      {/* 3. Core Features */}
      <section id="features" className="py-5 bg-white">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold display-6">안전한 집을 위한 핵심 도구</h2>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm p-4 rounded-5 text-center hover-shadow transition-all">
                <div className="bg-emerald-light text-emerald rounded-circle d-inline-flex align-items-center justify-content-center mb-4 mx-auto" style={{ width: '80px', height: '80px', backgroundColor: '#ecfdf5' }}>
                  <Scan size={40} color="#059669" />
                </div>
                <h3 className="fw-bold fs-4">문서 스캔 분석</h3>
                <p className="text-secondary mt-3">OCR 기술로 권리 관계와 위험 요소를 1분 안에 분석합니다.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm p-4 rounded-5 text-center hover-shadow transition-all">
                <div className="bg-emerald-light text-emerald rounded-circle d-inline-flex align-items-center justify-content-center mb-4 mx-auto" style={{ width: '80px', height: '80px', backgroundColor: '#ecfdf5' }}>
                  <ClipboardCheck size={40} color="#059669" />
                </div>
                <h3 className="fw-bold fs-4">안심 체크리스트</h3>
                <p className="text-secondary mt-3">계약 전후 시기별 맞춤형 체크리스트를 제공합니다.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm p-4 rounded-5 text-center hover-shadow transition-all">
                <div className="bg-emerald-light text-emerald rounded-circle d-inline-flex align-items-center justify-content-center mb-4 mx-auto" style={{ width: '80px', height: '80px', backgroundColor: '#ecfdf5' }}>
                  <MessageSquareText size={40} color="#059669" />
                </div>
                <h3 className="fw-bold fs-4">24시 AI 비서</h3>
                <p className="text-secondary mt-3">방대한 법률 데이터를 학습한 AI가 즉시 답변해 드립니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI Chatbot Teaser Section (Dark Mode) */}
      <section id="aibot" className="py-5 text-white overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
        <div className="container py-5">
          <div className="row align-items-center g-5">
            <div className="col-md-5">
              <span className="fw-bold mb-2 d-block" style={{ color: '#34d399' }}>AI 부동산 법률 비서</span>
              <h2 className="display-5 fw-bold mb-4">궁금한 건<br />참지 말고 물어보세요</h2>
              <p className="lead opacity-75 mb-5">
                계약 현장에서 모르는 용어가 나왔나요?<br />
                AI 비서가 당신의 편에서 알기 쉽게 설명해 드립니다.
              </p>
              <button
                onClick={(e) => handleProtectedAction(e, 'AI 비서 대화')}
                className="btn btn-emerald-light btn-lg rounded-pill fw-bold" style={{ backgroundColor: '#059669', border: 'none', color: 'white' }}>
                AI 비서와 대화하기 <ArrowRight className="ms-2" size={20} />
              </button>
            </div>
            <div className="col-md-7">
              <div className="card border-0 rounded-5 p-3 shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)', transform: 'rotate(-2deg)', maxWidth: '500px', margin: '0 auto' }}>
                <div className="card-body bg-white rounded-4 p-4 text-dark" style={{ height: '380px', display: 'flex', flexDirection: 'column' }}>
                  <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                    <div className="bg-emerald text-white rounded-circle p-2 me-3" style={{ backgroundColor: '#059669' }}><MessageSquareText size={20} /></div>
                    <h5 className="fw-bold m-0">홈스캐너 AI</h5>
                  </div>
                  <div className="d-flex flex-column gap-3 overflow-hidden">
                    <div className="align-self-start p-3 rounded-4 rounded-bottom-0" style={{ maxWidth: '85%', backgroundColor: '#f1f5f9' }}>
                      안녕하세요! 무엇을 도와드릴까요?
                    </div>
                    <div className="align-self-end text-white p-3 rounded-4 rounded-bottom-0" style={{ maxWidth: '85%', backgroundColor: '#059669' }}>
                      "전세자금대출 동의" 특약이 왜 중요한가요?
                    </div>
                    <div className="align-self-start p-3 rounded-4 rounded-bottom-0" style={{ maxWidth: '85%', backgroundColor: '#f1f5f9', fontSize: '0.9rem' }}>
                      임대인이 협조하지 않으면 대출 승인이 거절될 수 있기 때문입니다. 이 문구는 임차인의 권리를 보호하는...
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-top text-muted">
                    <div className="input-group">
                      <input type="text" className="form-control border-0 bg-light" placeholder="질문을 입력하세요..." disabled />
                      <button className="btn btn-link" style={{ color: '#059669' }} disabled><ArrowRight /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Checklist Preview Section */}
      <section id="checklist" className="py-5" style={{ backgroundColor: '#f8fafc' }}>
        <div className="container py-5 text-center">
          <h2 className="fw-bold mb-5">놓치기 쉬운 순간, 체크리스트가 챙겨드려요</h2>
          <div className="row justify-content-center g-4">
            <div className="col-md-5 col-lg-4">
              <div className="bg-white p-4 rounded-4 shadow-sm text-start border-top border-4" style={{ borderColor: '#059669 !important' }}>
                <h5 className="fw-bold mb-3">📝 계약 전 필수 체크</h5>
                <ul className="list-unstyled text-secondary">
                  <li className="mb-2"><CheckCircle2 size={18} className="me-2" color="#059669" />등기부등본 을구(근저당) 확인</li>
                  <li className="mb-2"><CheckCircle2 size={18} className="me-2" color="#059669" />건축물대장 위반건축물 여부</li>
                  <li className="mb-2"><CheckCircle2 size={18} className="me-2" color="#059669" />임대인 신분증 진위 확인</li>
                </ul>
                <a href="#" className="btn btn-sm rounded-pill mt-2 fw-bold" style={{ color: '#059669', border: '1px solid #059669' }}>전체 보기</a>
              </div>
            </div>
            <div className="col-md-5 col-lg-4">
              <div className="bg-white p-4 rounded-4 shadow-sm text-start border-top border-4" style={{ borderColor: '#10b981 !important' }}>
                <h5 className="fw-bold mb-3">🚚 이사 당일/사후 체크</h5>
                <ul className="list-unstyled text-secondary">
                  <li className="mb-2"><CheckCircle2 size={18} className="me-2" color="#10b981" />잔금 지급 전 등기부 재확인</li>
                  <li className="mb-2"><CheckCircle2 size={18} className="me-2" color="#10b981" />전입신고 및 확정일자 받기</li>
                  <li className="mb-2"><CheckCircle2 size={18} className="me-2" color="#10b981" />시설물 파손 상태 사진 촬영</li>
                </ul>
                <a href="#" className="btn btn-sm rounded-pill mt-2 fw-bold" style={{ color: '#10b981', border: '1px solid #10b981' }}>전체 보기</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="py-5 bg-white border-top">
        <div className="container">
          <div className="row g-4">
            {/* 브랜드 섹션 */}
            <div className="col-md-6 mb-4 mb-md-0">
              <h3 className="fw-bold mb-3 d-flex align-items-center justify-content-center" style={{ color: '#059669' }}>
                <Scan className="me-2" /> 홈스캐너
              </h3>
              <p className="text-secondary small">
                우리는 기술로 안전한 부동산 거래 문화를 만듭니다.<br />
                어려운 부동산 법률, 이제 AI와 함께 쉽고 안전하게 관리하세요.<br />
                © 2025 HomeScanner. All rights reserved.
              </p>
            </div>

            {/* 서비스 링크 섹션 */}
            <div className="col-6 col-md-3">
              <h6 className="fw-bold mb-3">서비스</h6>
              <ul className="list-unstyled small text-secondary">
                <li className="mb-2">
                  <a href="#features" className="text-decoration-none text-secondary">문서 촬영 분석</a>
                </li>
                <li className="mb-2">
                  <a href="#checklist" className="text-decoration-none text-secondary">안심 체크리스트</a>
                </li>
                <li className="mb-2">
                  <a href="#aibot" className="text-decoration-none text-secondary">AI 부동산 비서</a>
                </li>
              </ul>
            </div>

            {/* 계정/액션 섹션 (로그인 상태에 따라 변화) */}
            <div className="col-6 col-md-3">
              <h6 className="fw-bold mb-3">계정</h6>
              <ul className="list-unstyled small text-secondary">
                {isLoggedIn ? (
                  <>
                    <li className="mb-2">
                      <a href="/mypage" className="text-decoration-none text-secondary">마이페이지</a>
                    </li>
                    <li className="mb-2">
                      <a href="/history" className="text-decoration-none text-secondary">분석 이력 관리</a>
                    </li>
                    <li className="mb-2">
                      <button
                        onClick={() => setIsLoggedIn(false)}
                        className="btn btn-link p-0 text-decoration-none text-secondary small"
                        style={{ fontSize: '0.875rem' }}
                      >
                        로그아웃
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="mb-2">
                      <a href="/login" className="text-decoration-none text-secondary">로그인</a>
                    </li>
                    <li className="mb-2">
                      <a href="/signup" className="text-decoration-none text-secondary">회원가입</a>
                    </li>
                    <li className="mb-2">
                      <a href="#" className="text-decoration-none text-secondary">고객센터</a>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Global CSS */}
      <style>{`
        .btn-emerald { background-color: #059669; border: none; transition: all 0.3s; }
        .btn-emerald:hover { background-color: #047857; transform: translateY(-2px); }
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.3s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
        .hover-scale:hover { transform: scale(1.02); transition: 0.2s; }
        .hover-shadow:hover { box-shadow: 0 1rem 3rem rgba(0,0,0,.1)!important; }
      `}</style>
    </div>
  );
};

export default Home;