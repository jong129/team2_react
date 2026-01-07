import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FolderOpen, Trash2, CheckCircle2, RefreshCcw, Search, RotateCcw } from "lucide-react";
import { axiosInstance } from "../Tool";

export default function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const memberId = useMemo(() => Number(localStorage.getItem("loginMemberId")), []);

  // ✅ PRE/POST 탭 (POST 완료 후 navigate state로 넘어오면 POST로 시작)
  const initialPhase = location?.state?.phase === "POST" ? "POST" : "PRE";
  const [phase, setPhase] = useState(initialPhase); // "PRE" | "POST"

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  // 검색 필터
  const [statusFilter, setStatusFilter] = useState(""); // "" | "IN_PROGRESS" | "COMPLETED"
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState(""); // YYYY-MM-DD

  // 페이징
  const [page, setPage] = useState(0);
  const [size] = useState(5);
  const [pageInfo, setPageInfo] = useState(null);

  const buildParams = () => {
    const params = { memberId, page, size };
    if (statusFilter) params.status = statusFilter;

    if (fromDate) params.from = `${fromDate}T00:00:00`;
    if (toDate) params.to = `${toDate}T23:59:59`;

    return params;
  };

  // ✅ phase에 따라 history endpoint 변경
  const loadHistory = async () => {
    const url = phase === "PRE" ? "/checklists/pre/history" : "/checklists/post/history";
    const res = await axiosInstance.get(url, { params: buildParams() });
    return res.data; // PageResponseDTO 또는 Page 객체(백엔드에 맞춤)
  };

  // ✅ 완료 처리: PRE는 기존 API 유지 / POST는 우리가 만든 complete 사용
  const completeSession = async (sessionId) => {
    if (phase === "PRE") {
      await axiosInstance.post(`/checklists/pre/session/${sessionId}/complete`, null, { params: { memberId } });
      return;
    }
    await axiosInstance.patch(`/checklists/post/session/${sessionId}/complete`);
  };

  // ✅ 삭제 처리: POST 삭제 API 없으면 우선 PRE만 살리고, POST는 나중에 추가 가능
  const deleteSession = async (sessionId) => {
    if (phase === "PRE") {
      await axiosInstance.delete(`/checklists/pre/session/${sessionId}`, {
        params: { memberId },
      });
      return;
    }

    // ✅ POST 삭제
    await axiosInstance.delete(`/checklists/post/session/${sessionId}`);
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
      setPageInfo(data);
      setItems(Array.isArray(data?.content) ? data.content : []);
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
  }, [page, phase]);

  // 탭 변경하면 0페이지부터 다시
  const changePhase = (next) => {
    setPhase(next);
    setPage(0);
  };

  const openSession = (sessionId) => {
    if (phase === "PRE") navigate("/checklist/pre", { state: { sessionId } });
    else navigate("/checklist/post", { state: { sessionId } }); // ✅ 너 라우트에 맞게 수정
  };

  const fmt = (v) => {
    if (!v) return "-";
    return String(v).replace("T", " ").slice(0, 19);
  };

  const handleSearch = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      alert("기간 설정이 올바르지 않습니다.");
      return;
    }
    if (page === 0) await refresh();
    else setPage(0);
  };

  const handleResetFilters = async () => {
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    if (page === 0) await refresh();
    else setPage(0);
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
    if (!window.confirm("이 기록을 삭제할까요?")) return;

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

  const title = phase === "PRE" ? "사전 체크 기록보기" : "사후 체크 기록보기";
  const header = phase === "PRE" ? "내 사전 체크리스트 기록" : "내 사후 체크리스트 기록";
  const desc =
    phase === "PRE"
      ? "완료/진행 중인 사전 세션을 다시 열거나, 완료/삭제할 수 있어요."
      : "완료/진행 중인 사후 세션을 다시 열거나, 완료/삭제할 수 있어요.";

  return (
    <div className="bg-white overflow-hidden" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <nav className="navbar navbar-light bg-white border-bottom sticky-top py-3 shadow-sm">
        <div className="container d-flex align-items-center justify-content-between">
          <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => navigate("/checklist")}>
            <ArrowLeft size={16} className="me-1" />
            체크리스트 홈
          </button>

          <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: "#059669" }}>
            <FolderOpen className="me-1" />
            {title}
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

              {/* ✅ PRE/POST 탭 */}
              <div className="d-flex gap-2 mb-3">
                <button
                  className={`btn btn-sm rounded-pill ${phase === "PRE" ? "btn-success" : "btn-outline-secondary"}`}
                  onClick={() => changePhase("PRE")}
                  disabled={loading}
                >
                  사전(PRE)
                </button>
                <button
                  className={`btn btn-sm rounded-pill ${phase === "POST" ? "btn-success" : "btn-outline-secondary"}`}
                  onClick={() => changePhase("POST")}
                  disabled={loading}
                >
                  사후(POST)
                </button>
              </div>

              <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
                <div>
                  <h2 className="fw-bold mb-1">{header}</h2>
                  <p className="text-secondary mb-0">{desc}</p>
                </div>
              </div>

              {/* 검색 패널 */}
              <div className="p-3 p-lg-4 rounded-4 border bg-white mb-4">
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-4">
                    <label className="form-label small text-secondary mb-1">상태</label>
                    <select
                      className="form-select rounded-4"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">전체</option>
                      <option value="IN_PROGRESS">진행중</option>
                      <option value="COMPLETED">완료</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label small text-secondary mb-1">시작일</label>
                    <input
                      type="date"
                      className="form-control rounded-4"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label small text-secondary mb-1">종료일</label>
                    <input
                      type="date"
                      className="form-control rounded-4"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="col-12 d-flex gap-2 justify-content-end flex-wrap mt-1">
                    <button
                      className="btn btn-sm btn-outline-emerald rounded-pill fw-bold"
                      onClick={handleSearch}
                      disabled={loading}
                    >
                      <Search size={16} className="me-1" />
                      검색
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary rounded-pill"
                      onClick={handleResetFilters}
                      disabled={loading}
                    >
                      <RotateCcw size={16} className="me-1" />
                      초기화
                    </button>
                  </div>
                </div>
              </div>

              {loading && <div className="p-4 rounded-4 border text-center bg-white">불러오는 중…</div>}
              {!loading && error && <div className="p-4 rounded-4 border text-danger bg-white">에러: {error}</div>}

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
                              <span className={`badge rounded-pill ${completed ? "bg-success" : "bg-warning text-dark"}`}>
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

                  {pageInfo && pageInfo.totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-secondary small">
                        총 {pageInfo.totalElements}건 · {pageInfo.number + 1} / {pageInfo.totalPages} 페이지
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-secondary rounded-pill"
                          disabled={pageInfo.first || loading}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                          이전
                        </button>

                        <button
                          className="btn btn-sm btn-outline-secondary rounded-pill"
                          disabled={pageInfo.last || loading}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          다음
                        </button>
                      </div>
                    </div>
                  )}
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
