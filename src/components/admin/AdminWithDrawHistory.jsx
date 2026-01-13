import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

const AdminWithDrawHistory = () => {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 복구 요청 중인 memberId (버튼 개별 로딩 처리)
  const [restoringId, setRestoringId] = useState(null);

  const currentPage = pageInfo?.page ?? pageInfo?.number ?? page;
  const totalPages = pageInfo?.totalPages ?? 0;

  const hasPrev = pageInfo?.hasPrev ?? (pageInfo ? !pageInfo.first : page > 0);
  const hasNext = pageInfo?.hasNext ?? (pageInfo ? !pageInfo.last : false);

  const pageNumbers = useMemo(() => {
    const start = Math.floor(currentPage / 5) * 5;
    const end = Math.min(start + 5, totalPages);
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("/api/admin/withdraw-histories", {
        params: {
          keyword: query || undefined,
          page,
          size,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setRows(res.data.content || []);
      setPageInfo(res.data);
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
      else setError("조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page, size, from, to]);

  const onSearch = () => {
    setPage(0);
    setQuery(keyword.trim());
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") onSearch();
  };

  const goPrev = () => {
    if (hasPrev) setPage((p) => Math.max(0, p - 1));
  };

  const goNext = () => {
    if (hasNext) setPage((p) => p + 1);
  };

  const purgeByPeriod = async () => {
    if (!from || !to) {
      alert("삭제 기간(from/to)을 선택하세요.");
      return;
    }

    if (!window.confirm(`${from} ~ ${to} 기간의 탈퇴 이력을 삭제할까요?`)) return;

    try {
      await axiosInstance.post("/api/admin/withdraw-histories/purge", null, {
        params: { from, to },
      });
      alert("기간 삭제 완료");
      setPage(0);
      fetchList();
    } catch (err) {
      if (err.response?.status === 401) alert("로그인이 필요합니다.");
      else if (err.response?.status === 403) alert("관리자 권한이 없습니다.");
      else alert("삭제 실패");
    }
  };

  // ✅ 복구(STATUS를 ACTIVE로 되돌림)
  // 전제: POST /api/admin/members/{memberId}/restore
  const restoreMember = async (memberId, loginId) => {
    if (!memberId) {
      alert("memberId가 없어 복구할 수 없습니다.");
      return;
    }

    const label = loginId ? `${loginId} 계정` : `회원(${memberId})`;
    if (!window.confirm(`${label}을(를) 복구(활성화)할까요?`)) return;

    setRestoringId(memberId);
    try {
      await axiosInstance.post(`/api/admin/members/${memberId}/restore`);
      alert("복구 완료");

      // ✅ 복구된 row는 버튼 숨김 처리(기록은 유지)
      setRows((prev) =>
        prev.map((r) => (r.memberId === memberId ? { ...r, memberStatus: "ACTIVE" } : r))
      );

      // fetchList(); // 서버 기준으로 재조회 필요하면 주석 해제
    } catch (err) {
      if (err.response?.status === 401) alert("로그인이 필요합니다.");
      else if (err.response?.status === 403) alert("관리자 권한이 없습니다.");
      else alert("복구 실패");
    } finally {
      setRestoringId(null);
    }
  };

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold m-0">회원탈퇴 이력</h2>
          <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/dashboard")}>
            뒤로
          </button>
        </div>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h2 className="fw-bold m-0">회원탈퇴 이력</h2>
          <div className="text-secondary small mt-1">검색 / 기간 조회 / 기간 삭제 / 복구</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/dashboard")}>
          뒤로
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="검색 (아이디 / 이름 / 사유)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>

            <div className="col-md-2 d-grid">
              <button className="btn btn-success" onClick={onSearch} disabled={loading}>
                검색
              </button>
            </div>

            <div className="col-md-2">
              <select
                className="form-select"
                value={size}
                onChange={(e) => {
                  setPage(0);
                  setSize(Number(e.target.value));
                }}
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={50}>50개</option>
              </select>
            </div>

            <div className="col-md-2">
              <div className="text-secondary small">
                총 {pageInfo?.totalElements ?? 0}건 / {totalPages}페이지
              </div>
            </div>
          </div>

          <div className="row g-2 align-items-center mt-3">
            <div className="col-md-3">
              <label className="form-label small text-secondary mb-1">From</label>
              <input className="form-control" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small text-secondary mb-1">To</label>
              <input className="form-control" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="col-md-3 d-grid">
              <button className="btn btn-outline-danger mt-md-4" onClick={purgeByPeriod} disabled={loading}>
                기간 삭제
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 90 }}>No</th>
                  <th style={{ width: 180 }}>로그인ID</th>
                  <th style={{ width: 160 }}>이름</th>
                  <th style={{ width: 140 }}>사유코드</th>
                  <th>사유</th>
                  <th style={{ width: 220 }}>시각</th>
                  <th style={{ width: 160 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-secondary">
                      로딩중...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-secondary">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={r.withdrawId ?? `${r.memberId}-${r.createdAt}-${idx}`}>
                      <td>{page * size + idx + 1}</td>
                      <td>{r.loginId}</td>
                      <td>{r.name}</td>
                      <td>{r.reasonCode || "-"}</td>
                      <td className="text-truncate" style={{ maxWidth: 520 }}>
                        {r.reasonText || "-"}
                      </td>
                      <td>{r.createdAt}</td>
                      <td>
                        <div className="d-flex gap-2">
                          {/* ✅ 복구 완료면 버튼 숨김 */}
                          {r.memberStatus !== "ACTIVE" && (
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => restoreMember(r.memberId, r.loginId)}
                              disabled={loading || restoringId === r.memberId}
                            >
                              {restoringId === r.memberId ? "복구중..." : "복구"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center p-3">
            <button className="btn btn-outline-secondary" onClick={goPrev} disabled={!hasPrev || loading}>
              이전
            </button>

            <div className="d-flex gap-2 flex-wrap justify-content-center">
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  className={`btn ${p === currentPage ? "btn-success" : "btn-outline-success"}`}
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p + 1}
                </button>
              ))}
            </div>

            <button className="btn btn-outline-secondary" onClick={goNext} disabled={!hasNext || loading}>
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWithDrawHistory;
