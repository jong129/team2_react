import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FolderOpen, Trash2, CheckCircle2, RefreshCcw } from "lucide-react";
import { axiosInstance } from "../Tool";  

export default function PreHistoryPage() {
  const navigate = useNavigate();

  const memberId = useMemo(() => Number(localStorage.getItem("loginMemberId")), []);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null); // 버튼 중복 클릭 방지
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const loadHistory = async () => {
    const res = await axiosInstance.get("/checklists/pre/history", {
      params: { memberId },
    });
    return res.data; // List<SessionHistoryItem>
  };

  const completeSession = async (sessionId) => {
    await axiosInstance.post(`/checklists/pre/session/${sessionId}/complete`, null, {
      params: { memberId },
    });
  };

  const deleteSession = async (sessionId) => {
    // 컨트롤러가 DELETE로 열려있으면 이게 정석
    // (만약 POST로 열었으면 여기만 post로 바꾸면 됨)
    await axiosInstance.delete(`/checklists/pre/session/${sessionId}`, {
      params: { memberId },
    });
  };

  const refresh = async () => {
    try {
      setLoading(true);
      setError("");

      if (!memberId) {
        alert("로그인이 필요합니다.");
        navigate("/member_login");
        return;
      }

      const data = await loadHistory();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "기록 불러오기 중 오류";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSession = (sessionId) => {
    // 작성 화면으로 이동(이어하기)
    navigate("/checklist/pre", { state: { sessionId } });
  };

  const fmt = (v) => {
    if (!v) return "-";
    // LocalDateTime이 문자열로 오면 대충 보기 좋게
    return String(v).replace("T", " ").slice(0, 19);
  };

  const handleComplete = async (sessionId) => {
    if (!window.confirm("이 세션을 완료 처리할까요?")) return;

    try {
      setBusyId(sessionId);
      await completeSession(sessionId);
      await refresh();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "완료 처리 중 오류";
      alert(String(msg));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm("이 기록을 삭제(숨김)할까요?")) return;

    try {
      setBusyId(sessionId);
      await deleteSession(sessionId);
      await refresh();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "삭제 처리 중 오류";
      alert(String(msg));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white overflow-hidden" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 상단 바 */}
      <nav className="navbar navbar-light bg-white border-bottom sticky-top py-3 shadow-sm">
        <div className="container d-flex align-items-center justify-content-between">
          <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => navigate("/checklist")}>
            <ArrowLeft size={16} className="me-1" />
            체크리스트 홈
          </button>

          <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: "#059669" }}>
            <FolderOpen className="me-1" />
            사전 체크 기록보기
          </div>

          <button className="btn btn-sm btn-outline-emerald rounded-pill" onClick={refresh} disabled={loading}>
            <RefreshCcw size={16} className="me-1" />
            새로고침
          </button>
        </div>
      </nav>

      <section className="py-5" style={{ backgroundColor: "#f8fafc" }}>
        <div className="container">
          <div className="mx-auto" style={{ maxWidth: 980 }}>
            <div className="border rounded-5 p-4 p-lg-5 shadow-sm bg-white">
              <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
                <div>
                  <h2 className="fw-bold mb-1">내 사전(PRE) 체크리스트 기록</h2>
                  <p className="text-secondary mb-0">완료/진행 중인 세션을 다시 열거나, 완료/삭제할 수 있어요.</p>
                </div>
              </div>

              {loading && (
                <div className="p-4 rounded-4 border text-center bg-white">불러오는 중…</div>
              )}

              {!loading && error && (
                <div className="p-4 rounded-4 border text-danger bg-white">에러: {error}</div>
              )}

              {!loading && !error && items.length === 0 && (
                <div className="p-4 rounded-4 border text-center bg-white">
                  아직 저장된 기록이 없어요. 체크리스트를 시작해보세요!
                </div>
              )}

              {!loading && !error && items.length > 0 && (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr className="text-muted">
                        <th style={{ width: 90 }}>세션</th>
                        <th style={{ width: 140 }}>상태</th>
                        <th style={{ width: 180 }}>시작</th>
                        <th style={{ width: 180 }}>완료</th>
                        <th style={{ width: 260 }} className="text-end">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => {
                        const isBusy = busyId === it.sessionId;
                        const status = it.status || "";
                        const completed = status === "COMPLETED";

                        return (
                          <tr key={it.sessionId}>
                            <td className="fw-bold">#{it.sessionId}</td>
                            <td>
                              <span
                                className={`badge rounded-pill ${
                                  completed ? "bg-success" : "bg-warning text-dark"
                                }`}
                              >
                                {completed ? "완료" : "진행중"}
                              </span>
                            </td>
                            <td className="small">{fmt(it.startedAt)}</td>
                            <td className="small">{fmt(it.completedAt)}</td>
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-2 flex-wrap">
                                <button
                                  className="btn btn-sm btn-outline-secondary rounded-pill"
                                  onClick={() => openSession(it.sessionId)}
                                  disabled={isBusy}
                                >
                                  <FolderOpen size={16} className="me-1" />
                                  열기
                                </button>

                                {!completed && (
                                  <button
                                    className="btn btn-sm btn-outline-emerald rounded-pill fw-bold"
                                    onClick={() => handleComplete(it.sessionId)}
                                    disabled={isBusy}
                                  >
                                    <CheckCircle2 size={16} className="me-1" />
                                    완료
                                  </button>
                                )}

                                <button
                                  className="btn btn-sm btn-outline-danger rounded-pill"
                                  onClick={() => handleDelete(it.sessionId)}
                                  disabled={isBusy}
                                >
                                  <Trash2 size={16} className="me-1" />
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      <style>{`
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.2s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
      `}</style>
    </div>
  );
}
