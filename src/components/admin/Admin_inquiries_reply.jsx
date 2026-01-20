import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

const Admin_inquiries_reply = () => {
  const navigate = useNavigate();

  // filters
  const [status, setStatus] = useState(""); // RECEIVED / IN_PROGRESS / CLOSED / ""
  const [statusQuery, setStatusQuery] = useState("");

  // paging
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // data
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);

  // ui
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // detail / reply modal
  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState(null);

  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const currentPage = pageInfo?.page ?? pageInfo?.number ?? page;
  const totalPages = pageInfo?.totalPages ?? 0;

  const hasPrev = pageInfo?.hasPrev ?? (pageInfo ? !pageInfo.first : page > 0);
  const hasNext = pageInfo?.hasNext ?? (pageInfo ? !pageInfo.last : false);

  const pageNumbers = useMemo(() => {
    const start = Math.floor(currentPage / 5) * 5;
    const end = Math.min(start + 5, totalPages);
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const statusLabel = (s) => {
    if (s === "RECEIVED") return "문의접수";
    if (s === "IN_PROGRESS") return "답변중";
    if (s === "CLOSED") return "종료";
    return s || "-";
  };

  const badgeClass = (s) => {
    if (s === "RECEIVED") return "badge bg-warning text-dark";
    if (s === "IN_PROGRESS") return "badge bg-info text-dark";
    if (s === "CLOSED") return "badge bg-success";
    return "badge bg-secondary";
  };

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("/api/admin/inquiries", {
        params: {
          status: statusQuery || undefined,
          page,
          size,
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

  const fetchDetail = async (inquiryId) => {
    setOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    setReplyText("");

    try {
      const res = await axiosInstance.get(`/api/admin/inquiries/${inquiryId}`);
      setDetail(res.data);
      // 답변이 이미 있으면 textarea에 미리 채워서 보이게
      if (res.data?.replyContent) setReplyText(res.data.replyContent);
    } catch (err) {
      if (err.response?.status === 401) setDetailError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setDetailError("관리자 권한이 없습니다.");
      else setDetailError("상세 조회 실패");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusQuery, page, size]);

  const onSearch = () => {
    setPage(0);
    setStatusQuery(status);
  };

  const goPrev = () => {
    if (hasPrev) setPage((p) => Math.max(0, p - 1));
  };

  const goNext = () => {
    if (hasNext) setPage((p) => p + 1);
  };

  const submitReply = async () => {
    if (!detail?.inquiryId) return;
    const content = (replyText || "").trim();
    if (!content) {
      alert("답변 내용을 입력하세요.");
      return;
    }

    // 이미 답변 존재(1문의 1답변 정책)
    if (detail?.replyId) {
      alert("이미 답변이 등록된 문의입니다.");
      return;
    }

    if (!window.confirm("답변을 등록하면 문의 상태가 '종료'로 변경됩니다. 진행할까요?")) return;

    setReplyLoading(true);
    try {
      await axiosInstance.post("/api/admin/inquiries/reply", {
        inquiryId: detail.inquiryId,
        content: replyText, // 원문 유지
      });

      alert("답변 등록 완료");
      setOpen(false);
      setPage(0);
      fetchList();
    } catch (err) {
      if (err.response?.status === 401) alert("로그인이 필요합니다.");
      else if (err.response?.status === 403) alert("관리자 권한이 없습니다.");
      else if (err.response?.status === 409) alert("이미 답변이 등록된 문의입니다.");
      else alert("답변 등록 실패");
    } finally {
      setReplyLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold m-0">1:1 문의 관리</h2>
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
          <h2 className="fw-bold m-0">1:1 문의 관리</h2>
          <div className="text-secondary small mt-1">문의 상태별 목록 확인 및 답변 등록</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/dashboard")}>
          뒤로
        </button>
      </div>

      {/* 검색/필터 */}
      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">상태 전체</option>
                <option value="RECEIVED">RECEIVED (문의접수)</option>
                <option value="IN_PROGRESS">IN_PROGRESS (답변중)</option>
                <option value="CLOSED">CLOSED (종료)</option>
              </select>
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

            <div className="col-md-4 text-end">
              <div className="text-secondary small">
                총 {pageInfo?.totalElements ?? 0}건 / {totalPages}페이지
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 90 }}>No</th>
                  <th style={{ width: 120 }}>상태</th>
                  <th>제목</th>
                  <th style={{ width: 140 }}>유형</th>
                  <th style={{ width: 180 }}>작성자ID</th>
                  <th style={{ width: 220 }}>등록일</th>
                  <th style={{ width: 120 }} className="text-center">
                    상세
                  </th>
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
                    <tr key={r.inquiryId ?? `${idx}`}>
                      <td>{page * size + idx + 1}</td>
                      <td>
                        <span className={badgeClass(r.status)}>{statusLabel(r.status)}</span>
                      </td>
                      <td className="fw-semibold">{r.title}</td>
                      <td className="text-secondary">{r.category || "-"}</td>
                      <td className="text-secondary">{r.memberId}</td>
                      <td className="text-secondary">{r.createdAt}</td>
                      <td className="text-center">
                        <button
                          className="btn btn-outline-success"
                          onClick={() => fetchDetail(r.inquiryId)}
                          disabled={loading}
                        >
                          보기
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이징 */}
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

      {/* 상세/답변 모달 */}
      {open && (
        <div
          className="modal-backdrop"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            zIndex: 1050,
          }}
        >
          <div
            className="bg-white shadow-lg rounded-4"
            style={{ width: 860, maxWidth: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
              <div className="fw-bold">문의 상세 / 답변</div>
              <button className="btn btn-outline-secondary" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>

            <div className="p-4">
              {detailLoading ? (
                <div className="text-secondary">로딩중...</div>
              ) : detailError ? (
                <div className="alert alert-danger">{detailError}</div>
              ) : detail ? (
                <>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <span className={badgeClass(detail.status)}>{statusLabel(detail.status)}</span>
                    <span className="badge bg-light text-dark">유형: {detail.category || "-"}</span>
                    <span className="badge bg-light text-dark">작성자ID: {detail.memberId}</span>
                    <span className="badge bg-light text-dark">등록일: {detail.createdAt}</span>
                  </div>

                  <div className="fw-bold mb-2">{detail.title}</div>

                  <div className="rounded-3 p-3 mb-4" style={{ background: "#f8fafc", border: "1px solid #eef2f7" }}>
                    <div className="small text-secondary mb-1">문의 내용</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{detail.content}</div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-bold">관리자 답변</div>
                    {detail.replyId ? (
                      <span className="badge bg-success">답변 완료</span>
                    ) : (
                      <span className="badge bg-secondary">미답변</span>
                    )}
                  </div>

                  {detail.replyId && (
                    <div className="text-secondary small mb-2">
                      답변자(관리자ID): {detail.adminMemberId} / 답변일: {detail.answeredAt}
                    </div>
                  )}

                  <textarea
                    className="form-control"
                    style={{ minHeight: 160, resize: "vertical" }}
                    placeholder="답변 내용을 입력하세요"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={replyLoading || !!detail.replyId}
                  />

                  <div className="d-flex justify-content-end gap-2 mt-3">
                    <button className="btn btn-outline-secondary" onClick={() => setOpen(false)} disabled={replyLoading}>
                      닫기
                    </button>

                    <button
                      className="btn btn-success"
                      onClick={submitReply}
                      disabled={replyLoading || !!detail.replyId}
                      title={detail.replyId ? "이미 답변이 등록되었습니다." : ""}
                    >
                      {replyLoading ? "등록중..." : "답변 등록"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-secondary">데이터가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin_inquiries_reply;
