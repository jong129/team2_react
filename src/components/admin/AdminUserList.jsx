import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool"; // 너 프로젝트에서 쓰는 axiosInstance 경로에 맞춰 수정

const AdminUserList = () => {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState(""); // 실제 요청에 쓰는 검색어(엔터/버튼으로 확정)
  const [page, setPage] = useState(0); // 0-based
  const [size, setSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalPages = pageInfo?.totalPages ?? 0;

  const pageNumbers = useMemo(() => {
    // 간단한 5개 단위 페이지 표시
    const current = pageInfo?.page ?? page;
    const start = Math.floor(current / 5) * 5;
    const end = Math.min(start + 5, totalPages);
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  }, [pageInfo, page, totalPages]);

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("/api/admin/members", {
        params: { keyword: query, page, size }
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
  }, [query, page, size]);

  const onSearch = () => {
    setPage(0);
    setQuery(keyword.trim());
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") onSearch();
  };

  const goPrev = () => {
    if (pageInfo?.hasPrev) setPage((p) => Math.max(0, p - 1));
  };

  const goNext = () => {
    if (pageInfo?.hasNext) setPage((p) => p + 1);
  };

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold m-0">회원조회</h2>
          <button className="btn btn-outline-secondary" onClick={() => navigate("/admin")}>
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
          <h2 className="fw-bold m-0">회원조회</h2>
          <div className="text-secondary small mt-1">회원 목록 검색 / 페이징</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/dashboard")}>
          뒤로
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2 align-items-center">
            <div className="col-md-8">
              <input
                className="form-control"
                placeholder="검색 (아이디 / 이름 / 이메일)"
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
          </div>

          <div className="mt-3 text-secondary small">
            총 {pageInfo?.totalElements ?? 0}명 / {totalPages}페이지
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 90 }}>회원ID</th>
                  <th style={{ width: 180 }}>로그인ID</th>
                  <th style={{ width: 160 }}>이름</th>
                  <th>이메일</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5 text-secondary">
                      로딩중...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-5 text-secondary">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.memberId}>
                      <td>{r.memberId}</td>
                      <td>{r.loginId}</td>
                      <td>{r.name}</td>
                      <td>{r.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center p-3">
            <button className="btn btn-outline-secondary" onClick={goPrev} disabled={!pageInfo?.hasPrev || loading}>
              이전
            </button>

            <div className="d-flex gap-2 flex-wrap justify-content-center">
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  className={`btn ${p === (pageInfo?.page ?? page) ? "btn-success" : "btn-outline-success"}`}
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p + 1}
                </button>
              ))}
            </div>

            <button className="btn btn-outline-secondary" onClick={goNext} disabled={!pageInfo?.hasNext || loading}>
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserList;
