import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import { ArrowLeft, MessageSquareText, PlusCircle } from "lucide-react";

const Member_inquiries = () => {
  const navigate = useNavigate();

  // ✅ 문의 유형(드롭다운 옵션) - 필요하면 너가 원하는 값으로 수정
  const categoryOptions = useMemo(
    () => [
      { code: "", name: "유형 선택(선택)" },
      { code: "ACCOUNT", name: "계정/회원" },
      { code: "BUG", name: "오류/버그" },
      { code: "FEATURE", name: "기능 문의" },
      { code: "ETC", name: "기타" },
    ],
    []
  );

  // paging
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // data
  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);

  // ui state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState(""); // ✅ select 값(코드)
  const [newContent, setNewContent] = useState("");

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState(null);

  const currentPage = pageInfo?.page ?? pageInfo?.number ?? page;
  const totalPages = pageInfo?.totalPages ?? 0;
  const totalElements = pageInfo?.totalElements ?? 0;

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

  const categoryLabel = (codeOrName) => {
    // DB에 name으로 저장돼 있을 수도 있어서 fallback 처리
    const found = categoryOptions.find((x) => x.code === codeOrName);
    return found ? found.name : (codeOrName || "-");
  };

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("/mypage/inquiries", {
        params: { page, size },
      });
      setRows(res.data.content || []);
      setPageInfo(res.data);
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("접근 권한이 없습니다.");
      else setError("문의 목록 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (inquiryId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);

    try {
      const res = await axiosInstance.get(`/mypage/inquiries/${inquiryId}`);
      setDetail(res.data);
    } catch (err) {
      if (err.response?.status === 401) setDetailError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setDetailError("접근 권한이 없습니다.");
      else setDetailError("문의 상세 조회에 실패했습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  const goPrev = () => {
    if (hasPrev) setPage((p) => Math.max(0, p - 1));
  };

  const goNext = () => {
    if (hasNext) setPage((p) => p + 1);
  };

  const openCreate = () => {
    setNewTitle("");
    setNewCategory("");
    setNewContent("");
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const title = (newTitle || "").trim();
    const content = (newContent || "").trim();

    if (!title) {
      alert("제목은 필수입니다.");
      return;
    }
    if (!content) {
      alert("내용은 필수입니다.");
      return;
    }

    setCreateLoading(true);
    try {
      await axiosInstance.post("/mypage/inquiries", {
        title: newTitle,              // 원문 유지
        content: newContent,          // 원문 유지(줄바꿈 포함)
        category: newCategory || null // ✅ 드롭다운 코드 저장(선택)
      });
      alert("문의가 접수되었습니다.");
      setCreateOpen(false);
      setPage(0);
      fetchList();
    } catch (err) {
      if (err.response?.status === 401) alert("로그인이 필요합니다.");
      else if (err.response?.status === 403) alert("접근 권한이 없습니다.");
      else alert("문의 등록에 실패했습니다.");
    } finally {
      setCreateLoading(false);
    }
  };

  const renderReplyBox = () => {
    if (!detail) return null;

    const hasReply = !!detail.replyContent;

    if (!hasReply) {
      return (
        <div className="card border-0 rounded-4 p-3" style={{ backgroundColor: "#f8fafc" }}>
          <div className="fw-bold mb-1" style={{ color: "#059669" }}>관리자 답변</div>
          <div className="text-secondary small">아직 답변이 등록되지 않았습니다.</div>
        </div>
      );
    }

    return (
      <div className="card border-0 rounded-4 p-3" style={{ backgroundColor: "#ecfdf5" }}>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div className="fw-bold" style={{ color: "#059669" }}>관리자 답변</div>
          <div className="text-secondary small">답변일: {detail.answeredAt || "-"}</div>
        </div>
        <div style={{ whiteSpace: "pre-wrap" }}>{detail.replyContent}</div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif", maxWidth: 980 }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="fw-bold m-0">
            <MessageSquareText size={20} className="me-2" style={{ color: "#059669" }} />
            1:1 문의
          </h2>
          <button className="btn btn-outline-secondary" onClick={() => navigate("/member/mypage")}>
            뒤로
          </button>
        </div>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="container py-5" style={{ maxWidth: 980 }}>
        {/* 헤더 */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-light rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: 40, height: 40 }}
              onClick={() => navigate("/member/mypage")}
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="fw-bold" style={{ color: "#059669" }}>
                <MessageSquareText className="me-2" size={20} />
                1:1 문의
              </div>
              <h2 className="fw-extrabold mb-0">문의 내역 / 답변 확인</h2>
              <div className="text-secondary small mt-1">
                문의를 등록하고, 관리자 답변을 확인할 수 있습니다.
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-emerald rounded-pill px-4 fw-bold" onClick={fetchList} disabled={loading}>
              새로고침
            </button>
            <button className="btn btn-emerald rounded-pill px-4 fw-bold text-white" onClick={openCreate}>
              <PlusCircle size={18} className="me-2" />
              문의하기
            </button>
          </div>
        </div>

        {/* 요약 */}
        <div className="card border-0 shadow-sm rounded-5 p-4 mb-4" style={{ backgroundColor: "#f0fdf4" }}>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div className="fw-bold" style={{ color: "#059669" }}>안내</div>
              <div className="text-secondary small mt-1">
                답변이 등록되면 상세 보기에서 확인할 수 있습니다.
              </div>
            </div>
            <div className="text-secondary small">
              총 {totalElements}건 / {totalPages}페이지
            </div>
          </div>
        </div>

        {/* 목록 */}
        <div className="card border-0 shadow-sm rounded-5">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 90 }}>No</th>
                    <th style={{ width: 120 }}>상태</th>
                    <th>제목</th>
                    <th style={{ width: 180 }}>유형</th>
                    <th style={{ width: 220 }}>등록일</th>
                    <th style={{ width: 120 }} className="text-center">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-secondary">
                        로딩중...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-secondary">
                        문의 내역이 없습니다.
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
                        <td className="text-secondary">{categoryLabel(r.category)}</td>
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
      </div>

      {/* 문의 등록 모달 */}
      {createOpen && (
        <div
          onClick={() => setCreateOpen(false)}
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
            className="bg-white shadow-lg rounded-5"
            style={{ width: 760, maxWidth: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
              <div className="fw-bold" style={{ color: "#059669" }}>1:1 문의 등록</div>
              <button className="btn btn-outline-secondary" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                닫기
              </button>
            </div>

            <div className="p-4">
              <div className="row g-2">
                <div className="col-12">
                  <label className="form-label small text-secondary mb-1">제목</label>
                  <input
                    className="form-control"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    disabled={createLoading}
                  />
                </div>

                {/* ✅ 드롭다운 */}
                <div className="col-12">
                  <label className="form-label small text-secondary mb-1">문의 유형(선택)</label>
                  <select
                    className="form-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    disabled={createLoading}
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.code || "EMPTY"} value={opt.code}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label small text-secondary mb-1">내용</label>
                  <textarea
                    className="form-control"
                    style={{ minHeight: 180, resize: "vertical" }}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="문의 내용을 입력하세요"
                    disabled={createLoading}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-3">
                <button className="btn btn-outline-secondary" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                  취소
                </button>
                <button className="btn btn-success" onClick={submitCreate} disabled={createLoading}>
                  {createLoading ? "등록중..." : "등록"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {detailOpen && (
        <div
          onClick={() => setDetailOpen(false)}
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
            className="bg-white shadow-lg rounded-5"
            style={{ width: 860, maxWidth: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
              <div className="fw-bold" style={{ color: "#059669" }}>문의 상세</div>
              <button className="btn btn-outline-secondary" onClick={() => setDetailOpen(false)}>
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
                    <span className="badge bg-light text-dark">유형: {categoryLabel(detail.category)}</span>
                    <span className="badge bg-light text-dark">등록일: {detail.createdAt || "-"}</span>
                  </div>

                  <div className="fw-bold mb-2">{detail.title}</div>

                  <div className="rounded-4 p-3 mb-4" style={{ background: "#f8fafc", border: "1px solid #eef2f7" }}>
                    <div className="small text-secondary mb-1">문의 내용</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{detail.content}</div>
                  </div>

                  {renderReplyBox()}
                </>
              ) : (
                <div className="text-secondary">데이터가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-emerald { background-color: #059669; border: none; transition: all 0.3s; }
        .btn-emerald:hover { background-color: #047857; transform: translateY(-2px); }
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.3s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
      `}</style>
    </div>
  );
};

export default Member_inquiries;
