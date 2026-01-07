import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance } from "../Tool";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";

const PHASE_LABEL = { PRE: "사전", POST: "사후" };
const TEMPLATE_STATUS_LABEL = {
  DRAFT: "초안",
  ACTIVE: "활성화",
  RETIRED: "비활성화",
};

function ynBadge(yn) {
  return yn === "Y" ? "badge text-bg-success" : "badge text-bg-secondary";
}
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

  // ✅ 템플릿 메타(단건)
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaSaving, setMetaSaving] = useState(false);
  const [template, setTemplate] = useState(null);

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // ✅ 메타 변경 감지용 기준값
  const [originName, setOriginName] = useState("");
  const [originDesc, setOriginDesc] = useState("");

  // ✅ 템플릿 구성(매핑)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [templateItems, setTemplateItems] = useState([]);

  // ✅ 항목 풀
  const [poolLoading, setPoolLoading] = useState(true);
  const [poolError, setPoolError] = useState("");
  const [poolPage, setPoolPage] = useState(null);

  const [poolPhase, setPoolPhase] = useState("");
  const [poolPostGroupCode, setPoolPostGroupCode] = useState("");
  const [poolKeyword, setPoolKeyword] = useState("");
  const [poolOnlyActive, setPoolOnlyActive] = useState(true);
  const [poolPageNo, setPoolPageNo] = useState(0);
  const poolSize = 10;

  // ✅ 편집 가능 여부: DRAFT에서만 구성 편집
  const editable = template?.status === "DRAFT";

  // ✅ 메타 변경 여부(간단히: 이름/설명만)
  const dirtyMeta = useMemo(() => {
    const a = (editName ?? "").trim();
    const b = (originName ?? "").trim();
    const c = (editDesc ?? "").trim();
    const d = (originDesc ?? "").trim();
    return a !== b || c !== d;
  }, [editName, editDesc, originName, originDesc]);

  const selectedIds = useMemo(
    () => new Set(templateItems.map((x) => x.itemMasterId)),
    [templateItems]
  );

  const poolQuery = useMemo(() => {
    const params = { page: poolPageNo, size: poolSize };
    if (poolPhase) params.phase = poolPhase;
    if (poolPostGroupCode) params.postGroupCode = poolPostGroupCode;
    if (poolOnlyActive) params.activeYn = "Y";
    if (poolKeyword.trim()) params.keyword = poolKeyword.trim();
    return params;
  }, [poolPageNo, poolPhase, poolPostGroupCode, poolOnlyActive, poolKeyword]);

  // ✅ 메타 단건 조회
  const fetchTemplate = async () => {
    try {
      setMetaLoading(true);
      const res = await axiosInstance.get(`/admin/checklists/templates/${templateId}`);
      setTemplate(res.data);

      const name = res.data.templateName ?? "";
      const desc = res.data.description ?? "";

      setEditName(name);
      setEditDesc(desc);

      // ✅ 기준값 갱신(변경 감지용)
      setOriginName(name);
      setOriginDesc(desc);
    } catch (e) {
      alert("템플릿 메타 조회 실패");
      setTemplate(null);
    } finally {
      setMetaLoading(false);
    }
  };

  // ✅ 템플릿 구성 조회
  const fetchTemplateItems = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axiosInstance.get(`/admin/checklists/templates/${templateId}/items`);
      const sorted = [...res.data].sort((a, b) => (a.itemOrder ?? 0) - (b.itemOrder ?? 0));
      setTemplateItems(sorted);
    } catch (e) {
      setError("템플릿 구성 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 항목 풀 조회
  const fetchPool = async () => {
    try {
      setPoolLoading(true);
      setPoolError("");
      const res = await axiosInstance.get(`/admin/checklists/item-masters`, { params: poolQuery });
      setPoolPage(res.data);
    } catch (e) {
      setPoolError("항목 풀 조회 실패");
    } finally {
      setPoolLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
    fetchTemplateItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    fetchPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolQuery]);

  // ✅ 메타 저장 (이름/설명만)
  const saveMeta = async () => {
    try {
      setMetaSaving(true);
      await axiosInstance.patch(`/admin/checklists/templates/${templateId}/meta`, {
        templateName: editName,
        description: editDesc,
      });
      await fetchTemplate();
      alert("메타 저장 완료");
    } catch (e) {
      alert("메타 저장 실패");
    } finally {
      setMetaSaving(false);
    }
  };

  // ✅ 상태 변경은 여기서만
  const changeTemplateStatus = async (nextStatus) => {
    try {
      await axiosInstance.patch(`/admin/checklists/templates/${templateId}/status`, {
        status: nextStatus,
      });
      await fetchTemplate();
      alert("상태 변경 완료");
    } catch (e) {
      alert("상태 변경 실패");
    }
  };

  const nextOrder = () => {
    const max = templateItems.reduce((m, x) => Math.max(m, x.itemOrder ?? 0), 0);
    return max + 1;
  };

  const addFromPool = (row) => {
    if (!editable) return;
    if (selectedIds.has(row.itemMasterId)) return;

    setTemplateItems((prev) => {
      const item = {
        itemMasterId: row.itemMasterId,
        itemOrder: nextOrder(),
        requiredYn: "Y",
        activeYn: "Y",
        phase: row.phase,
        postGroupCode: row.postGroupCode,
        title: row.title,
        description: row.description,
      };
      return [...prev, item].sort((a, b) => a.itemOrder - b.itemOrder);
    });
  };

  const removeItem = (itemMasterId) => {
    if (!editable) return;
    setTemplateItems((prev) => prev.filter((x) => x.itemMasterId !== itemMasterId));
  };

  const move = (idx, dir) => {
    if (!editable) return;
    setTemplateItems((prev) => {
      const arr = [...prev].sort((a, b) => a.itemOrder - b.itemOrder);
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return arr;

      const a = arr[idx];
      const b = arr[ni];
      const tmp = a.itemOrder;
      a.itemOrder = b.itemOrder;
      b.itemOrder = tmp;

      return [...arr].sort((x, y) => x.itemOrder - y.itemOrder);
    });
  };

  const toggleRequired = (itemMasterId) => {
    if (!editable) return;
    setTemplateItems((prev) =>
      prev.map((x) =>
        x.itemMasterId === itemMasterId
          ? { ...x, requiredYn: x.requiredYn === "Y" ? "N" : "Y" }
          : x
      )
    );
  };

  const toggleActive = (itemMasterId) => {
    if (!editable) return;
    setTemplateItems((prev) =>
      prev.map((x) =>
        x.itemMasterId === itemMasterId
          ? { ...x, activeYn: x.activeYn === "Y" ? "N" : "Y" }
          : x
      )
    );
  };

  // ✅ 목록 이동: 저장 안 한 메타 변경 있으면 경고
  const goList = () => {
    if (dirtyMeta) {
      const ok = confirm("저장하지 않은 변경사항(템플릿명/설명)이 있어요. 목록으로 이동할까요?");
      if (!ok) return;
    }
    navigate("/admin/checklists/templates");
  };

  // ✅ A안: 구성 저장 버튼이 메타+구성 같이 저장
  const saveAll = async () => {
    if (!editable) {
      alert("초안(DRAFT) 상태에서만 구성 저장이 가능합니다.");
      return;
    }

    try {
      setSaving(true);

      // 1) 메타 변경 있으면 먼저 저장
      if (dirtyMeta) {
        await axiosInstance.patch(`/admin/checklists/templates/${templateId}/meta`, {
          templateName: editName.trim(),
          description: editDesc.trim() ? editDesc.trim() : null,
        });

        // ✅ 기준값 갱신(경고/변경 감지 해제)
        setOriginName(editName.trim());
        setOriginDesc(editDesc);
      }

      // 2) 구성 저장
      const sorted = [...templateItems].sort((a, b) => a.itemOrder - b.itemOrder);
      const body = sorted.map((x, index) => ({
        itemMasterId: x.itemMasterId,
        itemOrder: index + 1,
        requiredYn: x.requiredYn,
        activeYn: x.activeYn,
      }));

      await axiosInstance.put(`/admin/checklists/templates/${templateId}/items`, body);

      // 3) 최신화
      await fetchTemplate();      // 메타 갱신
      await fetchTemplateItems(); // 구성 갱신

      alert("전체 저장 완료 (메타 + 구성)");
    } catch (e) {
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const poolRows = poolPage?.content ?? [];

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1">템플릿 구성 수정</h2>
          <div className="text-secondary small">templateId: {templateId}</div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-secondary" onClick={goList}>
            <ArrowLeft size={16} className="me-1" />
            목록
          </button>

          <button
            className="btn btn-success"
            onClick={saveAll}
            disabled={saving || loading || !editable}
            title={!editable ? "초안(DRAFT)에서만 저장 가능" : "전체 저장(메타+구성)"}
          >
            <Save size={16} className="me-1" />
            {saving ? "저장중..." : "전체 저장"}
          </button>
        </div>
      </div>

      {/* ✅ 메타 패널 */}
      <div className="border rounded-4 shadow-sm p-3 mb-4">
        {metaLoading ? (
          <div className="text-secondary small">템플릿 정보를 불러오는 중...</div>
        ) : !template ? (
          <div className="text-danger small">템플릿 정보를 가져오지 못했습니다.</div>
        ) : (
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small mb-1">템플릿명</label>
              <input
                className="form-control form-control-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label small mb-1">단계</label>
              <input
                className="form-control form-control-sm"
                value={PHASE_LABEL[template.phase] ?? template.phase}
                disabled
              />
            </div>

            <div className="col-md-2">
              <label className="form-label small mb-1">버전</label>
              <input className="form-control form-control-sm" value={`v${template.versionNo}`} disabled />
            </div>

            {/* ✅ 상태: 읽기 전용 */}
            <div className="col-md-3">
              <label className="form-label small mb-1">상태</label>
              <input
                className="form-control form-control-sm"
                value={TEMPLATE_STATUS_LABEL[template.status] ?? template.status}
                disabled
              />
            </div>

            <div className="col-12">
              <label className="form-label small mb-1">설명</label>
              <input
                className="form-control form-control-sm"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="설명(선택)"
              />
            </div>

            <div className="col-12 d-flex align-items-center justify-content-between flex-wrap gap-2 mt-1">
              <div className="text-secondary small">
                현재 상태:{" "}
                <span className={statusBadge(template.status)}>
                  {TEMPLATE_STATUS_LABEL[template.status] ?? template.status}
                </span>
                {template.postGroupCode ? ` · 그룹: ${template.postGroupCode}` : ""}
                {!editable && (
                  <span className="text-danger ms-2">
                    (현재 상태에서는 구성 편집이 잠겨있음: 초안에서만 가능)
                  </span>
                )}
                {dirtyMeta && <span className="text-warning ms-2">(메타 변경됨)</span>}
              </div>

              <div className="d-flex gap-2">
                {/* ✅ 메타 저장 버튼은 남겨둬도 됨(선택) */}
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={saveMeta}
                  disabled={metaSaving}
                  title="메타만 별도로 저장"
                >
                  {metaSaving ? "메타 저장중..." : "메타 저장"}
                </button>

                {/* ✅ 상태 변경 */}
                <select
                  className="form-select form-select-sm"
                  value={template.status}
                  onChange={(e) => changeTemplateStatus(e.target.value)}
                  style={{ width: 140 }}
                  title="즉시 상태 변경"
                >
                  <option value="DRAFT">초안</option>
                  <option value="ACTIVE">활성화</option>
                  <option value="RETIRED">비활성화</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row g-3">
        {/* 왼쪽: 현재 템플릿 구성 */}
        <div className="col-lg-7">
          <div className="border rounded-4 shadow-sm p-3">
            <div className="d-flex align-items-end justify-content-between mb-2">
              <div>
                <div className="fw-bold">현재 템플릿 구성</div>
                <div className="text-secondary small">순서 / 필수 / 숨김</div>
              </div>
              <div className="text-secondary small">총 {templateItems.length}개</div>
            </div>

            {loading ? (
              <div className="py-4 text-center text-secondary">불러오는 중...</div>
            ) : templateItems.length === 0 ? (
              <div className="py-4 text-center text-secondary">구성된 항목이 없습니다.</div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 70 }}>순서</th>
                      <th>항목</th>
                      <th style={{ width: 90 }}>단계</th>
                      <th style={{ width: 90 }}>필수</th>
                      <th style={{ width: 90 }}>표시</th>
                      <th style={{ width: 160 }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...templateItems]
                      .sort((a, b) => a.itemOrder - b.itemOrder)
                      .map((x, idx) => (
                        <tr key={x.itemMasterId}>
                          <td className="text-secondary">{x.itemOrder}</td>
                          <td>
                            <div className="fw-semibold">{x.title}</div>
                            {x.description && <div className="text-secondary small">{x.description}</div>}
                            <div className="text-secondary small mt-1">
                              masterId: {x.itemMasterId} {x.postGroupCode ? `· ${x.postGroupCode}` : ""}
                            </div>
                          </td>
                          <td>
                            <span className="badge text-bg-light border">
                              {PHASE_LABEL[x.phase] ?? x.phase}
                            </span>
                          </td>
                          <td>
                            <button
                              className={`btn btn-sm ${
                                x.requiredYn === "Y" ? "btn-success" : "btn-outline-secondary"
                              }`}
                              onClick={() => toggleRequired(x.itemMasterId)}
                              disabled={!editable}
                            >
                              {x.requiredYn === "Y" ? "필수" : "선택"}
                            </button>
                          </td>
                          <td>
                            <span className={ynBadge(x.activeYn)}>{x.activeYn === "Y" ? "표시" : "숨김"}</span>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => move(idx, -1)}
                                disabled={!editable || idx === 0}
                                title="위로"
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => move(idx, 1)}
                                disabled={!editable || idx === templateItems.length - 1}
                                title="아래로"
                              >
                                <ChevronDown size={16} />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => toggleActive(x.itemMasterId)}
                                disabled={!editable}
                                title="표시/숨김"
                              >
                                {x.activeYn === "Y" ? "숨김" : "표시"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeItem(x.itemMasterId)}
                                disabled={!editable}
                                title="삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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
        <div className="col-lg-5">
          <div className="border rounded-4 shadow-sm p-3">
            <div className="fw-bold mb-2">항목 풀에서 추가</div>

            {!editable && (
              <div className="alert alert-warning py-2 small">
                현재 상태에서는 추가/삭제/정렬이 불가능합니다. (초안에서만 가능)
              </div>
            )}

            {/* 필터 */}
            <div className="row g-2 mb-2">
              <div className="col-6">
                <label className="form-label small mb-1">단계</label>
                <select
                  className="form-select form-select-sm"
                  value={poolPhase}
                  onChange={(e) => {
                    setPoolPageNo(0);
                    setPoolPhase(e.target.value);
                  }}
                  disabled={!editable}
                >
                  <option value="">전체</option>
                  <option value="PRE">사전</option>
                  <option value="POST">사후</option>
                </select>
              </div>

              <div className="col-6">
                <label className="form-label small mb-1">그룹(사후)</label>
                <select
                  className="form-select form-select-sm"
                  value={poolPostGroupCode}
                  onChange={(e) => {
                    setPoolPageNo(0);
                    setPoolPostGroupCode(e.target.value);
                  }}
                  disabled={!editable}
                >
                  <option value="">전체</option>
                  <option value="POST_A">POST_A</option>
                  <option value="POST_B">POST_B</option>
                  <option value="POST_C">POST_C</option>
                  <option value="POST_D">POST_D</option>
                </select>
              </div>

              <div className="col-12">
                <label className="form-label small mb-1">검색</label>
                <input
                  className="form-control form-control-sm"
                  value={poolKeyword}
                  onChange={(e) => setPoolKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setPoolPageNo(0);
                  }}
                  placeholder="제목 검색"
                  disabled={!editable}
                />
              </div>

              <div className="col-12 d-flex align-items-center justify-content-between">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="onlyActive"
                    checked={poolOnlyActive}
                    onChange={(e) => {
                      setPoolPageNo(0);
                      setPoolOnlyActive(e.target.checked);
                    }}
                    disabled={!editable}
                  />
                  <label className="form-check-label small" htmlFor="onlyActive">
                    활성(Y)만
                  </label>
                </div>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setPoolPhase("");
                    setPoolPostGroupCode("");
                    setPoolKeyword("");
                    setPoolOnlyActive(true);
                    setPoolPageNo(0);
                  }}
                  disabled={!editable}
                >
                  초기화
                </button>
              </div>
            </div>

            {poolError && <div className="alert alert-danger py-2">{poolError}</div>}

            {/* 목록 */}
            <div className="border rounded-3 p-2" style={{ maxHeight: 520, overflow: "auto" }}>
              {poolLoading ? (
                <div className="py-4 text-center text-secondary">불러오는 중...</div>
              ) : poolRows.length === 0 ? (
                <div className="py-4 text-center text-secondary">항목이 없습니다.</div>
              ) : (
                poolRows.map((r) => {
                  const disabled = !editable || selectedIds.has(r.itemMasterId);
                  return (
                    <div key={r.itemMasterId} className="border rounded-3 p-2 mb-2">
                      <div className="d-flex justify-content-between gap-2">
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-semibold text-truncate">{r.title}</div>
                          {r.description && <div className="text-secondary small text-truncate">{r.description}</div>}
                          <div className="text-secondary small mt-1">
                            {PHASE_LABEL[r.phase] ?? r.phase}
                            {r.postGroupCode ? ` · ${r.postGroupCode}` : ""} · id:{r.itemMasterId}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => addFromPool(r)}
                          disabled={disabled}
                          title={
                            !editable
                              ? "초안(DRAFT)에서만 추가 가능"
                              : disabled
                              ? "이미 포함됨"
                              : "추가"
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 페이지네이션 */}
            <div className="d-flex align-items-center justify-content-between mt-2">
              <div className="text-secondary small">
                page {(poolPage?.number ?? 0) + 1} / {poolPage?.totalPages ?? 1} · 총{" "}
                {poolPage?.totalElements ?? 0}개
              </div>
              <div className="btn-group">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={poolPage?.first || poolLoading}
                  onClick={() => setPoolPageNo((p) => Math.max(0, p - 1))}
                >
                  이전
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={poolPage?.last || poolLoading}
                  onClick={() => setPoolPageNo((p) => p + 1)}
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-secondary small mt-3">
        * 구성 저장 시 순서는 1..n으로 자동 재정렬되어 저장됩니다.
      </div>
    </div>
  );
}
