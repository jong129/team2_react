import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Tool";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const PHASE_LABEL = { PRE: "사전", POST: "사후" };
const TEMPLATE_STATUS_LABEL = {
  DRAFT: "초안",
  ACTIVE: "활성화",
  RETIRED: "비활성화",
};

function statusBadge(status) {
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

export default function AdminChecklistTemplateEditPage() {
  const navigate = useNavigate();
  const { templateId } = useParams();

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


  /* =======================
   * 상태
   * ======================= */
  const [metaLoading, setMetaLoading] = useState(true);
  const [template, setTemplate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [templateItems, setTemplateItems] = useState([]);

  /* ===== 항목 풀 ===== */
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState("");
  const [poolPage, setPoolPage] = useState(null);

  const [poolPhase, setPoolPhase] = useState("PRE");
  const [poolPageNo, setPoolPageNo] = useState(0);
  const poolSize = 5;

  /** ✅ DRAFT에서만 편집 가능 */
  const editable = template?.status === "DRAFT";

  /* =======================
   * 계산 값
   * ======================= */

  /** ✅ 템플릿 단계와 풀 단계 불일치 여부 */
  const isPhaseMismatch =
    template?.phase && template.phase !== poolPhase;

  const selectedIds = useMemo(
    () => new Set(templateItems.map((x) => Number(x.itemMasterId))),
    [templateItems]
  );

  /** ✅ 풀 페이징 상태 */
  const poolHasPrev = poolPage && !poolPage.first;
  const poolHasNext = poolPage && !poolPage.last;

  const poolQuery = useMemo(() => {
    return {
      page: poolPageNo,
      size: poolSize,
      phase: poolPhase,
      activeYn: "Y",
    };
  }, [poolPageNo, poolPhase]);

  /* =======================
   * API
   * ======================= */

  // ✅ 템플릿 구성 저장
  const saveTemplateItems = async () => {
    if (!editable) return;

    try {
      // 🔹 TemplateItemSaveDto 형태로 변환
      const payload = templateItems
        .sort((a, b) => a.itemOrder - b.itemOrder)
        .map((x) => ({
          itemMasterId: x.itemMasterId,
          itemOrder: x.itemOrder,
          requiredYn: x.requiredYn,
        }));

      await axiosInstance.put(
        `/admin/checklists/templates/${templateId}/items`,
        payload
      );

      alert("템플릿 구성이 저장되었습니다.");

      // ✅ 서버 기준으로 다시 조회 (정합성 확보)
      fetchTemplateItems();
    } catch (e) {
      alert("템플릿 구성 저장에 실패했습니다.");
    }
  };

  // ✅ 템플릿 상태 변경
  const changeTemplateStatus = async (nextStatus) => {
    if (!template || template.status === nextStatus) return;

    try {
      await axiosInstance.patch(
        `/admin/checklists/templates/${templateId}/status`,
        { status: nextStatus }
      );

      // ✅ 성공 시 화면 상태 즉시 반영
      setTemplate((prev) => ({
        ...prev,
        status: nextStatus,
      }));
    } catch (e) {
      alert("템플릿 상태 변경에 실패했습니다.");
    }
  };

  const fetchTemplate = async () => {
    try {
      setMetaLoading(true);
      const res = await axiosInstance.get(
        `/admin/checklists/templates/${templateId}`
      );
      setTemplate(res.data);
    } finally {
      setMetaLoading(false);
    }
  };

  const fetchTemplateItems = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/admin/checklists/templates/${templateId}/items`
      );
      setTemplateItems(
        [...res.data].sort(
          (a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0)
        )
      );
    } catch {
      setError("템플릿 구성 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const fetchPool = async () => {
    try {
      setPoolLoading(true);
      const res = await axiosInstance.get(
        `/admin/checklists/item-masters/pool`,
        { params: poolQuery }
      );
      setPoolPage(res.data);
    } catch {
      setPoolError("항목 풀 조회 실패");
    } finally {
      setPoolLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
    fetchTemplateItems();
  }, [templateId]);

  useEffect(() => {
    if (editable) fetchPool();
  }, [poolQuery, editable]);

  /* =======================
   * 동작 함수
   * ======================= */
  const nextOrder = () =>
    Math.max(0, ...templateItems.map((x) => x.itemOrder ?? 0)) + 1;

  const addFromPool = (row) => {
    if (!editable) return;
    if (isPhaseMismatch) return; // ✅ 단계 불일치 시 추가 차단
    if (selectedIds.has(Number(row.itemMasterId))) return;

    setTemplateItems((prev) =>
      [
        ...prev,
        {
          itemMasterId: row.itemMasterId,
          itemOrder: nextOrder(),
          requiredYn: "Y",
          phase: row.phase,
          title: row.title,
          description: row.description,
        },
      ].sort((a, b) => a.itemOrder - b.itemOrder)
    );
  };

  /**
   * ✅ 템플릿 메타 정보 저장 (이름, 설명)
   */
  const saveTemplateMeta = async () => {
    if (!editable) return;

    try {
      await axiosInstance.patch(
        `/admin/checklists/templates/${templateId}/meta`, // ✅ /meta 추가
        {
          templateName: template.templateName,
          description: template.description ?? null, // ✅ DTO 정합성
        }
      );

      alert("템플릿명이 저장되었습니다.");
    } catch (e) {
      alert("템플릿명 저장에 실패했습니다.");
    }
  };


  const removeItem = (itemMasterId) => {
    if (!editable) return;
    setTemplateItems((prev) =>
      prev.filter((x) => Number(x.itemMasterId) !== Number(itemMasterId))
    );
  };

  const move = (idx, dir) => {
    if (!editable) return;
    setTemplateItems((prev) => {
      const arr = [...prev].sort((a, b) => a.itemOrder - b.itemOrder);
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return arr;

      const tmp = arr[idx].itemOrder;
      arr[idx].itemOrder = arr[ni].itemOrder;
      arr[ni].itemOrder = tmp;

      return [...arr].sort((a, b) => a.itemOrder - b.itemOrder);
    });
  };

  const toggleRequired = (itemMasterId) => {
    if (!editable) return;
    setTemplateItems((prev) =>
      prev.map((x) =>
        Number(x.itemMasterId) === Number(itemMasterId)
          ? { ...x, requiredYn: x.requiredYn === "Y" ? "N" : "Y" }
          : x
      )
    );
  };

  /* =======================
   * 렌더링
   * ======================= */
  const poolRows = poolPage?.content ?? [];

  return (
    <div className="container py-5">
      {/* 헤더 */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <input
            type="text"
            className={`form-control form-control-lg fw-bold px-2 ${editable
                ? "border border-primary bg-white"
                : "border-0 bg-transparent"
              }`}
            value={template?.templateName || ""}
            disabled={!editable}
            placeholder={editable ? "템플릿명을 입력하세요" : ""}
            onChange={(e) =>
              setTemplate((prev) => ({
                ...prev,
                templateName: e.target.value,
              }))
            }
          />

          <div className="d-flex align-items-center gap-2 mt-1">
            <span className={statusBadge(template?.status)}>
              {TEMPLATE_STATUS_LABEL[template?.status]}
            </span>

            {/* ✅ 상태 변경 버튼 */}
            <div className="btn-group btn-group-sm ms-2">
              <button
                className="btn btn-outline-secondary"
                disabled={template?.status === "DRAFT"}
                onClick={() => changeTemplateStatus("DRAFT")}
              >
                초안
              </button>
              <button
                className="btn btn-outline-success"
                disabled={template?.status === "ACTIVE"}
                onClick={() => changeTemplateStatus("ACTIVE")}
              >
                활성화
              </button>
              <button
                className="btn btn-outline-dark"
                disabled={template?.status === "RETIRED"}
                onClick={() => changeTemplateStatus("RETIRED")}
              >
                비활성화
              </button>
            </div>
            <button
              className="btn btn-sm btn-primary ms-2"
              disabled={!editable}
              onClick={async () => {
                await saveTemplateMeta();   // 🔹 템플릿명 저장
                await saveTemplateItems();  // 🔹 항목 저장
              }}
            >
              저장
            </button>
          </div>
        </div>

        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate("/admin/checklists/templates")}
        >
          <ArrowLeft size={16} className="me-1" />
          목록
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        {/* 왼쪽: 템플릿 구성 */}
        <div className={editable ? "col-lg-7" : "col-12"}>
          <div className="border rounded-4 shadow-sm p-3">
            <div className="fw-bold mb-2">
              현재 템플릿 구성 ({templateItems.length})
            </div>

            {loading ? (
              <div className="text-center py-4 text-secondary">
                불러오는 중...
              </div>
            ) : templateItems.length === 0 ? (
              <div className="text-center py-4 text-secondary">
                구성된 항목이 없습니다.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 60 }}>순서</th>
                      <th>항목</th>
                      <th style={{ width: 80 }}>단계</th>
                      <th style={{ width: 100 }}>필수여부</th>
                      <th style={{ width: 150 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...templateItems]
                      .sort((a, b) => a.itemOrder - b.itemOrder)
                      .map((x, idx) => (
                        <tr key={x.itemMasterId}>
                          <td>{x.itemOrder}</td>
                          <td>
                            <div className="fw-semibold">{x.title}</div>
                            {x.description && (
                              <div className="text-secondary small">
                                {x.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge text-bg-light border">
                              {PHASE_LABEL[x.phase]}
                            </span>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={x.requiredYn === "Y"}
                              disabled={!editable}
                              onChange={() =>
                                toggleRequired(x.itemMasterId)
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-secondary me-1"
                              disabled={!editable || idx === 0}
                              onClick={() => move(idx, -1)}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary me-1"
                              disabled={
                                !editable ||
                                idx === templateItems.length - 1
                              }
                              onClick={() => move(idx, 1)}
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              disabled={!editable}
                              onClick={() =>
                                removeItem(x.itemMasterId)
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 항목 풀 */}
        {editable && (
          <div className="col-lg-5">
            <div className="border rounded-4 shadow-sm p-3">
              {/* 단계 필터 */}
              <div className="d-flex gap-2 mb-3">
                {["PRE", "POST"].map((p) => (
                  <button
                    key={p}
                    className={`btn btn-sm rounded-pill ${poolPhase === p
                      ? "btn-success"
                      : "btn-outline-secondary"
                      }`}
                    onClick={() => {
                      setPoolPhase(p);
                      setPoolPageNo(0);
                    }}
                  >
                    {PHASE_LABEL[p]}({p})
                  </button>
                ))}
              </div>

              {/* 항목 풀 영역 */}
              {poolLoading ? (
                <div className="text-center py-4 text-secondary">
                  불러오는 중...
                </div>
              ) : isPhaseMismatch ? (
                /* ✅ 단계 불일치 안내 메시지 */
                <div className="alert alert-warning mb-0">
                  <div className="fw-semibold mb-1">단계 불일치</div>
                  <div className="small">
                    {template.phase === "PRE"
                      ? "사전 체크리스트에는 사후 항목을 추가할 수 없습니다."
                      : "사후 체크리스트에는 사전 항목을 추가할 수 없습니다."}
                  </div>
                </div>
              ) : (
                <>
                  <div className="d-flex flex-column gap-2">
                    {poolRows.map((r) => (
                      <div
                        key={r.itemMasterId}
                        className="border rounded-3 p-2 d-flex justify-content-between"
                      >
                        <div>
                          <div className="fw-semibold">{r.title}</div>
                          {r.description && (
                            <div className="text-secondary small">
                              {r.description}
                            </div>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-success"
                          disabled={selectedIds.has(
                            Number(r.itemMasterId)
                          )}
                          onClick={() => addFromPool(r)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 페이징 */}
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={!poolHasPrev}
                      onClick={() =>
                        setPoolPageNo((prev) => prev - 1)
                      }
                    >
                      이전
                    </button>

                    <div className="small text-secondary">
                      {poolPage &&
                        `${poolPage.number + 1} / ${poolPage.totalPages}`}
                    </div>

                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={!poolHasNext}
                      onClick={() =>
                        setPoolPageNo((prev) => prev + 1)
                      }
                    >
                      다음
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
