import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Truck,
  History,
  FolderOpen,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { axiosInstance } from "../Tool";

export default function ChecklistHome() {
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ✅ PRE 카드에서만 쓸 “선택 UI”
  const [showPreChoice, setShowPreChoice] = useState(false);
  const [preSessionId, setPreSessionId] = useState(null);

  const memberId = useMemo(() => Number(localStorage.getItem("loginMemberId")), []);

  // 홈 버튼(원하면 / 로)
  const goHome = () => navigate("/");

  const startSession = async (mid) => {
    const res = await axiosInstance.post("/checklists/pre/session/start", null, {
      params: { memberId: mid },
    });
    return res.data; // { sessionId, templateId, status }
  };

  const resetSession = async (sessionId) => {
    await axiosInstance.post(`/checklists/pre/session/${sessionId}/reset`);
  };

  // ✅ 진행중 데이터가 있는지 “응답 데이터 유무”로 판단
  // (PreChecklistPage에서 이미 쓰는 statuses API를 여기서도 재사용)
  const loadStatuses = async (sessionId) => {
    const res = await axiosInstance.get(`/checklists/pre/session/${sessionId}/statuses`);
    return res.data; // [{ itemId, checkStatus }]
  };

  // ✅ 기록 보기
  const goHistory = () => {
    navigate("/checklist/history");
  };

  // ✅ PRE “사전 체크 시작” 클릭 시:
  // 1) 세션 가져오기(없으면 생성)
  // 2) statuses 조회해서 데이터 있으면 선택 UI 띄우고, 없으면 바로 이동
  const handlePreStartClick = async () => {
    if (!memberId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const sess = await startSession(memberId);
      console.log("startSession resp:", sess);

      const sid = sess?.sessionId ?? sess?.id ?? sess?.checklistSessionId;

      if (!sid) {
        throw new Error("startSession 응답에 sessionId가 없습니다. (콘솔 확인)");
      }

      setPreSessionId(sid);

      const statuses = await loadStatuses(sid);
      const hasProgress = Array.isArray(statuses) && statuses.length > 0;

      if (hasProgress) {
        setShowPreChoice(true);
      } else {
        navigate("/checklist/pre", { state: { sessionId: sid } });
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "사전 체크 시작 중 오류";
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  };

  // ✅ POST 체크 시작
  const handlePostStartClick = async () => {
    if (!memberId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const res = await axiosInstance.post("/checklists/post/session/start", null, {
        params: { memberId },
      });

      const sid = res?.data?.sessionId;
      if (!sid) {
        throw new Error("POST start 응답에 sessionId가 없습니다.");
      }

      navigate("/checklist/post", { state: { sessionId: sid } });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "사후 체크 시작 중 오류";
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  };

  // ✅ 이어서 하기
  const handlePreContinue = async () => {
    if (!preSessionId) return;
    navigate("/checklist/pre", { state: { sessionId: preSessionId } });
  };

  // ✅ 새로 작성하기 = reset 후 이동
  const handlePreRestart = async () => {
    if (!preSessionId) return;

    try {
      setBusy(true);
      setError("");

      await resetSession(preSessionId);
      navigate("/checklist/pre", { state: { sessionId: preSessionId } });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "새로 작성하기 중 오류";
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white overflow-hidden" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 상단 바 */}
      <nav className="navbar navbar-light bg-white border-bottom sticky-top py-3 shadow-sm">
        <div className="container d-flex align-items-center justify-content-between">
          <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={goHome} disabled={busy}>
            메인으로
          </button>

          <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: "#059669" }}>
            <ClipboardCheck className="me-1" />
            체크리스트
          </div>

          <div className="d-none d-md-flex align-items-center gap-2 small text-muted">
            {busy ? "처리중..." : "체크하고 기록을 남기세요"}
          </div>
        </div>
      </nav>

      {/* 히어로 */}
      <section className="py-5 position-relative" style={{ backgroundColor: "#f8fafc" }}>
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backgroundColor: "#ecfdf5",
            clipPath: "polygon(0px 0px, 100% 0px, 100% 75%, 0% 100%)",
            zIndex: 0,
          }}
        />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-lg-10 text-center">
              <span
                className="d-inline-block py-1 px-3 rounded-pill bg-white fw-bold shadow-sm mb-3 border"
                style={{ color: "#059669", borderColor: "#d1fae5" }}
              >
                ✅ 계약 단계별 필수 점검
              </span>

              <h1 className="fw-extrabold mb-3 lh-base text-dark" style={{ fontSize: "2.2rem" }}>
                놓치기 쉬운 순간, <span style={{ color: "#059669" }}>체크리스트</span>로 안전하게
              </h1>

              <p className="text-secondary mb-0 mx-auto fw-medium" style={{ maxWidth: 760 }}>
                계약 전/후 단계별로 꼭 확인해야 할 항목을 빠짐없이 점검하세요.
                <br />
                작성한 체크는 저장되어, 나중에 다시 확인할 수 있어요.
              </p>

              {error && (
                <div className="mt-4 mx-auto text-start text-danger border rounded-4 p-3 bg-white shadow-sm" style={{ maxWidth: 760 }}>
                  에러: {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 이전 체크리스트 섹션: 기록 보기만 */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row g-4 justify-content-center">
            <div className="col-lg-10">
              <div className="border rounded-5 p-4 p-lg-5 shadow-sm bg-white">
                <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <History size={20} color="#059669" />
                      <h5 className="fw-bold mb-0">이전에 작성한 체크리스트</h5>
                    </div>
                    <p className="text-secondary mb-0">저장된 체크리스트를 다시 열어 확인할 수 있어요.</p>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      className="btn btn-outline-emerald rounded-pill fw-bold px-4"
                      onClick={goHistory}
                      disabled={busy}
                      title="완료 이력 리스트(다음 단계)"
                    >
                      <FolderOpen size={18} className="me-2" />
                      기록 보기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 체크리스트 선택 카드 */}
          <div className="text-center mt-5 mb-4">
            <h2 className="fw-bold">지금 상황에 맞는 체크리스트를 선택하세요</h2>
            <p className="text-secondary mb-0">계약 단계에 따라 필요한 항목이 달라요.</p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* PRE 카드 */}
            <div className="col-md-6 col-lg-5">
              <div className="card border-0 shadow-sm rounded-5 h-100 overflow-hidden">
                <div className="card-body p-4 p-lg-5">
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <div
                        className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                        style={{ width: 64, height: 64, backgroundColor: "#ecfdf5" }}
                      >
                        <ClipboardCheck size={30} color="#059669" />
                      </div>

                      <h3 className="fw-bold mb-2">📝 계약 전 필수 체크</h3>
                      <p className="text-secondary mb-3">
                        등기부등본/임대차계약서 확인부터
                        <br />
                        신분 확인·특약 점검까지 한 번에.
                      </p>
                    </div>

                    <span
                      className="badge rounded-pill"
                      style={{ backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #d1fae5" }}
                    >
                      추천
                    </span>
                  </div>

                  <ul className="list-unstyled text-secondary mb-4">
                    <li className="mb-2">
                      <CheckCircle2 size={18} className="me-2" color="#059669" />
                      등기부등본 ‘을구’(근저당/가압류) 확인
                    </li>
                    <li className="mb-2">
                      <CheckCircle2 size={18} className="me-2" color="#059669" />
                      건축물대장 위반건축물 여부 확인
                    </li>
                    <li className="mb-2">
                      <CheckCircle2 size={18} className="me-2" color="#059669" />
                      임대인 신분/대리권 및 특약 조항 점검
                    </li>
                  </ul>

                  {/* 기본 버튼 */}
                  {!showPreChoice ? (
                    <button
                      className="btn btn-emerald rounded-pill fw-bold text-white px-4"
                      onClick={handlePreStartClick}
                      disabled={busy}
                    >
                      <Clock size={18} className="me-2" />
                      사전 체크 시작
                    </button>
                  ) : (
                    // ✅ 진행중 데이터가 있으면 2버튼 노출
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        className="btn btn-emerald rounded-pill fw-bold text-white px-4"
                        onClick={handlePreContinue}
                        disabled={busy}
                      >
                        <PlayCircle size={18} className="me-2" />
                        이어서 하기
                      </button>

                      <button
                        className="btn btn-outline-secondary rounded-pill fw-bold px-4"
                        onClick={handlePreRestart}
                        disabled={busy}
                      >
                        <RotateCcw size={18} className="me-2" />
                        새로 작성하기
                      </button>
                    </div>
                  )}

                  {/* 선택 UI가 떴을 때 안내문 */}
                  {showPreChoice && (
                    <div className="small text-muted mt-3">
                      * 이전에 작성하던 내용이 있어요. 이어서 하거나 새로 작성할 수 있습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* POST 카드 */}
            <div className="col-md-6 col-lg-5">
              <div className="card border-0 shadow-sm rounded-5 h-100 overflow-hidden">
                <div className="card-body p-4 p-lg-5">
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <div
                        className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                        style={{ width: 64, height: 64, backgroundColor: "#f1f5f9" }}
                      >
                        <Truck size={30} color="#0ea5e9" />
                      </div>

                      <h3 className="fw-bold mb-2">🚚 이사 당일 / 사후 체크</h3>
                      <p className="text-secondary mb-3">
                        잔금 지급 전 재확인, 전입신고/확정일자,
                        <br />
                        하자 사진 기록 등 ‘마지막 안전장치’.
                      </p>
                    </div>

                    <span
                      className="badge rounded-pill"
                      style={{ backgroundColor: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" }}
                    >
                      사용 가능
                    </span>

                  </div>

                  <ul className="list-unstyled text-secondary mb-4">
                    <li className="mb-2">
                      <CheckCircle2 size={18} className="me-2" color="#94a3b8" />
                      잔금 지급 전 등기부 재확인
                    </li>
                    <li className="mb-2">
                      <CheckCircle2 size={18} className="me-2" color="#94a3b8" />
                      전입신고 및 확정일자 받기
                    </li>
                    <li className="mb-2">
                      <CheckCircle2 size={18} className="me-2" color="#94a3b8" />
                      시설물 하자 사진 촬영 및 기록
                    </li>
                  </ul>

                  <button
                    className="btn btn-outline-primary rounded-pill fw-bold px-4"
                    onClick={handlePostStartClick}
                    disabled={busy}
                  >
                    <PlayCircle size={18} className="me-2" />
                    사후 체크 시작
                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-4 bg-white border-top">
        <div className="container text-center">
          <p className="text-muted small mb-0">© 2025 홈스캐너</p>
        </div>
      </footer>

      <style>{`
        .btn-emerald { background-color: #059669; border: none; transition: all 0.3s; }
        .btn-emerald:hover { background-color: #047857; transform: translateY(-2px); }
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.3s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
      `}</style>
    </div>
  );
}
