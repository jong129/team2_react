import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

const AdminReportLog = () => {
  const navigate = useNavigate();

  // 검색 입력값
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");

  const [minCount, setMinCount] = useState(1);
  const [minCountQuery, setMinCountQuery] = useState(1);

  const [categoryId, setCategoryId] = useState("");
  const [categoryIdQuery, setCategoryIdQuery] = useState("");

  // 기간(date input -> yyyy-mm-dd)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // 페이지
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // 데이터
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);

  // 상세 모달
  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState(null);

  // 공통
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentPage = pageInfo?.page ?? pageInfo?.number ?? page;
  const totalPages = pageInfo?.totalPages ?? 0;

  const hasPrev = pageInfo?.hasPrev ?? (pageInfo ? !pageInfo.first : page > 0);
  const hasNext = pageInfo?.hasNext ?? (pageInfo ? !pageInfo.last : false);

  const pageNumbers = useMemo(() => {
    const start = Math.floor(currentPage / 5) * 5;
    const end = Math.min(start + 5, totalPages);
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  // date -> LocalDateTime string(ISO) 변환
  // 백엔드가 LocalDateTime ISO를 요구하므로:
  // fromAt: yyyy-mm-ddT00:00:00
  // toExclusive: (to 다음날) yyyy-mm-ddT00:00:00
  const toIsoStart = (d) => (d ? `${d}T00:00:00` : "");
  const addOneDay = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    dt.setDate(dt.getDate() + 1);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        keyword: query || undefined,
        categoryId: categoryIdQuery ? Number(categoryIdQuery) : undefined,
        minCount: minCountQuery ? Number(minCountQuery) : undefined,
        page,
        size,
        fromAt: from ? toIsoStart(from) : undefined,
        toExclusive: to ? toIsoStart(addOneDay(to)) : undefined,
      };

      const res = await axiosInstance.get("/api/admin/reports/boards", { params });
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
  }, [query, categoryIdQuery, minCountQuery, page, size, from, to]);

  const onSearch = () => {
    setPage(0);
    setQuery(keyword.trim());
    setCategoryIdQuery(categoryId.trim());
    setMinCountQuery(minCount);
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

  const openDetail = async (boardId) => {
    setOpen(true);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await axiosInstance.get(`/api/admin/reports/boards/${boardId}`);
      setDetail(res.data);
    } catch (err) {
      if (err.response?.status === 401) setDetailError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setDetailError("관리자 권한이 없습니다.");
      else if (err.response?.status === 404) setDetailError("게시글을 찾을 수 없습니다.");
      else setDetailError("상세 조회 실패");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setOpen(false);
    setDetail(null);
    setDetailError("");
  };

  const deleteHard = async () => {
    if (!detail?.boardId) return;

    if (!window.confirm("정말 삭제할까요? 삭제 후 복구할 수 없습니다.")) return;

    try {
      await axiosInstance.delete(`/api/admin/reports/boards/${detail.boardId}`);
      alert("삭제되었습니다.");
      closeDetail();
      setPage(0);
      fetchList();
    } catch (err) {
      if (err.response?.status === 401) alert("로그인이 필요합니다.");
      else if (err.response?.status === 403) alert("관리자 권한이 없습니다.");
      else alert("삭제 실패");
    }
  };

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold m-0">신고 관리</h2>
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
          <h2 className="fw-bold m-0">신고 관리</h2>
          <div className="text-secondary small mt-1">신고된 게시글 목록 / 상세 조회 / 삭제</div>
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
                placeholder="검색 (게시글 제목)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                type="number"
                min={1}
                placeholder="최소 신고 수"
                value={minCount}
                onChange={(e) => setMinCount(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                type="number"
                placeholder="카테고리 ID"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              />
            </div>

            <div className="col-md-2 d-grid">
              <button className="btn btn-success" onClick={onSearch} disabled={loading}>
                검색
              </button>
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

            <div className="col-md-3">
              <label className="form-label small text-secondary mb-1">Page Size</label>
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

            <div className="col-md-3">
              <div className="text-secondary small mt-4">
                총 {pageInfo?.totalElements ?? 0}건 / {totalPages}페이지
              </div>
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
                  <th style={{ width: 110 }}>boardId</th>
                  <th style={{ width: 160 }}>카테고리</th>
                  <th>제목</th>
                  <th style={{ width: 160 }}>작성자</th>
                  <th style={{ width: 120 }}>신고수</th>
                  <th style={{ width: 220 }}>최근 신고일</th>
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
                    <tr
                      key={`${r.boardId}-${idx}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDetail(r.boardId)}
                    >
                      <td>{page * size + idx + 1}</td>
                      <td>{r.boardId}</td>
                      <td>{r.categoryName ?? "-"}</td>
                      <td>{r.title}</td>
                      <td>{r.writerNickname ?? "-"}</td>
                      <td>{r.reportCount}</td>
                      <td>{r.lastReportedAt ?? "-"}</td>
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

      {/* 상세 모달 */}
      {open && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(0,0,0,0.45)", zIndex: 1050 }}
          onClick={closeDetail}
        >
          <div
            className="position-absolute top-50 start-50 translate-middle bg-white rounded-4 shadow"
            style={{ width: "min(980px, 94vw)", maxHeight: "90vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 p-md-4 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">신고 상세</div>
                <div className="text-secondary small">boardId: {detail?.boardId ?? "-"}</div>
              </div>
              <button className="btn btn-outline-secondary" onClick={closeDetail}>
                닫기
              </button>
            </div>

            <div className="p-3 p-md-4">
              {detailLoading ? (
                <div className="text-center py-5 text-secondary">로딩중...</div>
              ) : detailError ? (
                <div className="alert alert-danger">{detailError}</div>
              ) : !detail ? (
                <div className="text-center py-5 text-secondary">데이터 없음</div>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div>
                      <div className="fw-bold">{detail.title}</div>
                      <div className="text-secondary small mt-1">
                        {detail.categoryName ?? "-"} / 작성자: {detail.writerNickname ?? "-"} / 신고수:{" "}
                        {detail.reportCount} / 최근 신고일: {detail.lastReportedAt ?? "-"}
                      </div>
                    </div>
                    <button className="btn btn-outline-danger" onClick={deleteHard} disabled={detailLoading}>
                      삭제
                    </button>
                  </div>

                  <div className="card border-0 shadow-sm rounded-4 mb-3">
                    <div className="card-body">
                      <div className="fw-semibold mb-2">내용</div>
                      <div className="text-secondary" style={{ whiteSpace: "pre-wrap" }}>
                        {detail.content}
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
                              <th style={{ width: 120 }}>reportId</th>
                              <th style={{ width: 160 }}>신고자</th>
                              <th style={{ width: 160 }}>사유코드</th>
                              <th>사유</th>
                              <th style={{ width: 220 }}>신고일</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(detail.reports || []).length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-5 text-secondary">
                                  신고 내역이 없습니다.
                                </td>
                              </tr>
                            ) : (
                              detail.reports.map((r, idx) => (
                                <tr key={`${r.reportId}-${idx}`}>
                                  <td>{idx + 1}</td>
                                  <td>{r.reportId}</td>
                                  <td>{r.reporterNickname ?? r.reporterId}</td>
                                  <td>{r.reasonCode}</td>
                                  <td>{r.reasonText ?? "-"}</td>
                                  <td>{r.createdAt}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportLog;
