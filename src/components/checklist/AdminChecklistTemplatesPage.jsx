import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

const STATUS_LABEL = {
  DRAFT: "초안",
  ACTIVE: "활성화",
  RETIRED: "비활성화",
};

const PHASE_LABEL = {
  PRE: "사전",
  POST: "사후",
};

function badgeClass(status) {
  switch (status) {
    case "ACTIVE":
      return "badge text-bg-success";
    case "DRAFT":
      return "badge text-bg-secondary";
    case "RETIRED":
      return "badge text-bg-dark";
    default:
      return "badge text-bg-light";
  }
}

export default function AdminChecklistTemplatesPage() {
  const navigate = useNavigate();

  /* =======================
 * ✅ 로그인 체크
 * ======================= */
  useEffect(() => {
    const memberId = Number(localStorage.getItem("loginMemberId")) || 0;

    if (!memberId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [navigate]);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [pageData, setPageData] = useState(null);

  const [phase, setPhase] = useState("");
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const size = 10;

  /* ===== 정렬 (select 기반) ===== */
  const [sortKey, setSortKey] = useState("templateId");
  const [sortDir, setSortDir] = useState("asc");

  const query = useMemo(() => {
    const params = { page, size, sortKey, sortDir };
    if (phase) params.phase = phase;
    if (status) params.status = status;
    if (keyword.trim()) params.keyword = keyword.trim();
    return params;
  }, [phase, status, keyword, page, size, sortKey, sortDir]);

  const fetchList = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axiosInstance.get("/admin/checklists/templates/list", {
        params: query,
      });
      setPageData(res.data);
    } catch (e) {
      setError("목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const rows = pageData?.content ?? [];

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* ===== 헤더 ===== */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold mb-1">템플릿 목록</h2>
          <div className="text-secondary small">
            총 {pageData?.totalElements ?? 0}개
          </div>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate("/admin/checklist")}
        >
          뒤로
        </button>
      </div>

      {/* ===== 필터 / 정렬 ===== */}
      <div className="border rounded-4 p-3 shadow-sm mb-3">
        <div className="d-flex flex-wrap gap-3 align-items-end">

          {/* 단계 */}
          <div>
            <label className="form-label small mb-1">단계</label>
            <select
              className="form-select form-select-sm"
              value={phase}
              onChange={(e) => {
                setPage(0);
                setPhase(e.target.value);
              }}
            >
              <option value="">전체</option>
              <option value="PRE">사전</option>
              <option value="POST">사후</option>
            </select>
          </div>

          {/* 상태 */}
          <div>
            <label className="form-label small mb-1">상태</label>
            <select
              className="form-select form-select-sm"
              value={status}
              onChange={(e) => {
                setPage(0);
                setStatus(e.target.value);
              }}
            >
              <option value="">전체</option>
              <option value="DRAFT">초안</option>
              <option value="ACTIVE">활성화</option>
              <option value="RETIRED">비활성화</option>
            </select>
          </div>

          {/* 검색 */}
          <div>
            <label className="form-label small mb-1">검색</label>
            <input
              className="form-control form-control-sm"
              style={{ width: 220 }}
              placeholder="템플릿명 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setPage(0)}
            />
          </div>

          {/* 정렬 기준 */}
          <div>
            <label className="form-label small mb-1">정렬 기준</label>
            <select
              className="form-select form-select-sm"
              value={sortKey}
              onChange={(e) => {
                setPage(0);
                setSortKey(e.target.value);
              }}
            >
              <option value="templateId">ID순</option>
              <option value="versionNo">버전순</option>
              <option value="status">상태순</option>
              <option value="updatedAt">수정일순</option>
            </select>
          </div>

          {/* 정렬 방향 */}
          <div>
            <label className="form-label small mb-1">정렬 방향</label>
            <select
              className="form-select form-select-sm"
              value={sortDir}
              onChange={(e) => {
                setPage(0);
                setSortDir(e.target.value);
              }}
            >
              <option value="asc">오름차순</option>
              <option value="desc">내림차순</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ===== 테이블 ===== */}
      <div className="border rounded-4 shadow-sm overflow-hidden">
        <table className="table align-middle m-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 70 }}>ID</th>
              <th style={{ width: 90 }}>단계</th>
              <th>템플릿명</th>
              <th style={{ width: 90 }}>버전</th>
              <th style={{ width: 120 }}>상태</th>
              <th style={{ width: 140 }}>항목수</th>
              <th style={{ width: 170 }}>수정일</th>
              <th style={{ width: 180 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-secondary">
                  불러오는 중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-secondary">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.templateId}>
                  <td>{r.templateId}</td>
                  <td>
                    <span className="badge text-bg-light border">
                      {PHASE_LABEL[r.phase]}
                    </span>
                  </td>
                  <td className="fw-semibold">{r.templateName}</td>
                  <td>v{r.versionNo}</td>
                  <td>
                    <span className={badgeClass(r.status)}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td>
                    {r.itemCnt}
                  </td>
                  <td className="small text-secondary">
                    {r.updatedAt
                      ? new Date(r.updatedAt).toLocaleString("ko-KR", {
                        timeZone: "Asia/Seoul", // 한국 시간(KST) 명시
                      })
                      : "-"}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-success me-2"
                      disabled={busyId === r.templateId}
                      onClick={() =>
                        navigate(`/admin/checklists/templates/${r.templateId}/edit`)
                      }
                    >
                      수정
                    </button>
                    {r.phase !== "PRE" && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={busyId === r.templateId}
                        onClick={async () => {
                          if (!window.confirm("이 템플릿을 완전히 삭제할까요? (복구 불가)"))
                            return;

                          try {
                            setBusyId(r.templateId);
                            await axiosInstance.delete(
                              `/admin/checklists/templates/${r.templateId}`
                            );
                            fetchList();
                          } catch (e) {
                            alert(e?.response?.data?.message || "삭제에 실패했습니다.");
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== 페이지네이션 ===== */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-secondary small">
          page {(pageData?.number ?? 0) + 1} / {pageData?.totalPages ?? 1}
        </div>
        <div className="btn-group">
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={pageData?.first || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            이전
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={pageData?.last || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
