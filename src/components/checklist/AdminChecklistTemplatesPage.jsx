import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool"; // 경로 맞춰줘!
import { ArrowLeft, Plus } from "lucide-react";

const STATUSES = ["DRAFT", "ACTIVE", "RETIRED"];

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

const STATUS_LABEL = {
  DRAFT: "초안",
  ACTIVE: "활성화",
  RETIRED: "비활성화",
};

function statusLabel(status) {
  return STATUS_LABEL[status] ?? status;
}

const PHASE_LABEL = {
  PRE: "사전",
  POST: "사후",
};

function phaseLabel(phase) {
  return PHASE_LABEL[phase] ?? phase;
}


export default function AdminChecklistTemplatesPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [pageData, setPageData] = useState(null);

  const [phase, setPhase] = useState(""); // "" | PRE | POST
  const [status, setStatus] = useState(""); // "" | DRAFT | ACTIVE | RETIRED
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const size = 10;

  const [sortKey, setSortKey] = useState("templateId"); // "templateId" | "updatedAt"
  const [sortDir, setSortDir] = useState("asc");      // "asc" | "desc"

  const query = useMemo(() => {
    const params = { page, size };
    if (phase) params.phase = phase;
    if (status) params.status = status;
    if (keyword.trim()) params.keyword = keyword.trim();

    // ✅ 여기!
    params.sortKey = sortKey; // "templateId" | "updatedAt"
    params.sortDir = sortDir; // "asc" | "desc"

    return params;
  }, [phase, status, keyword, page, size, sortKey, sortDir]);


  const toggleSort = (key) => {
    setPage(0);
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc"); // 처음 클릭은 desc 추천
    }
  };


  const fetchList = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axiosInstance.get("/admin/checklists/templates", { params: query });
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

  const onChangeStatus = async (templateId, nextStatus) => {
    try {
      setBusyId(templateId);
      await axiosInstance.patch(`/admin/checklists/templates/${templateId}/status`, {
        status: nextStatus,
      });
      await fetchList();
    } catch (e) {
      alert("상태 변경 실패");
    } finally {
      setBusyId(null);
    }
  };

  const rows = pageData?.content ?? [];

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold mb-1">템플릿 목록</h2>
          <div className="text-secondary small">총 {pageData?.totalElements ?? 0}개</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/checklist")}>
          <ArrowLeft size={16} className="me-1" />
          체크리스트 관리
        </button>
      </div>

      {/* 필터/검색 */}
      {/* 필터/검색 */}
      <div className="border rounded-4 p-3 shadow-sm mb-3">
        <div className="d-flex justify-content-between align-items-end gap-3 flex-wrap">

          {/* ✅ 왼쪽: 필터/검색/정렬 */}
          <div className="d-flex gap-2 flex-wrap align-items-end">
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

            <div>
              <label className="form-label small mb-1">검색</label>
              <input
                className="form-control form-control-sm"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setPage(0);
                }}
                placeholder="템플릿명 검색"
                style={{ width: 220 }}
              />
            </div>

            <div>
              <label className="form-label small mb-1">정렬</label>
              <div className="btn-group btn-group-sm d-flex" role="group" aria-label="sort">
                <button
                  type="button"
                  className={`btn ${sortKey === "templateId" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => toggleSort("templateId")}
                  title="ID 기준 정렬"
                >
                  ID순 {sortKey === "templateId" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </button>

                <button
                  type="button"
                  className={`btn ${sortKey === "updatedAt" ? "btn-dark" : "btn-outline-secondary"}`}
                  onClick={() => toggleSort("updatedAt")}
                  title="수정일 기준 정렬"
                >
                  수정일순 {sortKey === "updatedAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </button>
              </div>
            </div>
          </div>

          {/* ✅ 오른쪽: 액션 버튼(초기화 + 템플릿 만들기) */}
          <div className="d-flex gap-2 align-items-end ms-auto">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setPhase("");
                setStatus("");
                setKeyword("");
                setPage(0);

                // ✅ 네가 원하는 기본값(ID순 asc)으로 초기화
                setSortKey("templateId");
                setSortDir("asc");
              }}
            >
              초기화
            </button>

            <button
              className="btn btn-sm btn-primary"
              onClick={() => navigate("/admin/checklists/templates/new")}
            >
              체크리스트 제작하기
            </button>
          </div>
        </div>
      </div>


      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* 테이블 */}
      <div className="border rounded-4 p-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
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
                <th style={{ width: 190 }}>관리</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-secondary">
                    불러오는 중...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-secondary">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.templateId}>
                    <td className="text-secondary">{r.templateId}</td>
                    <td>
                      <span className="badge text-bg-light border">{phaseLabel(r.phase)}</span>
                    </td>
                    <td>
                      <div className="fw-semibold">{r.templateName}</div>
                    </td>
                    <td className="text-secondary">v{r.versionNo}</td>
                    <td>
                      <span className={badgeClass(r.status)}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="text-secondary">
                      {r.activeItemCnt}/{r.itemCnt}
                    </td>
                    <td className="text-secondary small">
                      {r.updatedAt ? new Date(r.updatedAt).toLocaleString("ko-KR") : "-"}
                    </td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => navigate(`/admin/checklists/templates/${r.templateId}/edit`)}
                          disabled={busyId === r.templateId}
                        >
                          수정
                        </button>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyId === r.templateId}
                          onClick={async () => {
                            if (!confirm("이 템플릿을 삭제할까요?")) return;
                            try {
                              setBusyId(r.templateId);
                              // 삭제 = RETIRED로 변경
                              await axiosInstance.patch(`/admin/checklists/templates/${r.templateId}/status`, {
                                status: "RETIRED",
                              });
                              await fetchList();
                            } catch (e) {
                              alert("삭제(비활성화) 실패");
                            } finally {
                              setBusyId(null);
                            }
                          }}
                        >
                          삭제
                        </button>

                        {busyId === r.templateId && (
                          <span className="small text-secondary align-self-center">처리중…</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      <div className="d-flex align-items-center justify-content-between mt-3">
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
