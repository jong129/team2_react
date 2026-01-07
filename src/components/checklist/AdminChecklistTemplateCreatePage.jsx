import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import { ArrowLeft, Save } from "lucide-react";

const PHASE_LABEL = { PRE: "사전", POST: "사후" };

export default function AdminChecklistTemplateCreatePage() {
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ✅ 메타 입력값
  const [phase, setPhase] = useState("PRE");          // PRE | POST
  const [postGroupCode, setPostGroupCode] = useState(""); // POST일 때만
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");

  const canSubmit = useMemo(() => {
    if (!templateName.trim()) return false;
    if (phase === "POST" && !postGroupCode.trim()) return false;
    return true;
  }, [phase, postGroupCode, templateName]);

  const onSubmit = async () => {
    if (!canSubmit || saving) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        phase,
        postGroupCode: phase === "POST" ? postGroupCode.trim() : null,
        templateName: templateName.trim(),
        description: description.trim() ? description.trim() : null,
      };

      const res = await axiosInstance.post("/admin/checklists/templates", payload);

      // ✅ axiosInstance가 response.data만 리턴하는 경우까지 커버
      const data = res?.data ?? res;

      const newId = data?.templateId ?? data?.id;

      if (newId) {
        navigate(`/admin/checklists/templates/${newId}/edit`);
      } else {
        console.log("createTemplate response:", res);
        setError("생성은 됐는데 templateId 응답이 없습니다. (백엔드 응답 확인)");
        navigate("/admin/checklists/templates");
      }

    } catch (e) {
      setError("템플릿 생성 실패 (백엔드 API 확인 필요)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="fw-bold mb-1">템플릿 만들기</h2>
          <div className="text-secondary small">템플릿 기본 정보(메타)를 먼저 생성합니다.</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="me-1" />
          뒤로
        </button>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="border rounded-4 p-4 shadow-sm">
        {/* 단계 */}
        <div className="mb-3">
          <label className="form-label fw-semibold">단계</label>
          <select
            className="form-select"
            value={phase}
            onChange={(e) => {
              const v = e.target.value;
              setPhase(v);
              if (v !== "POST") setPostGroupCode("");
            }}
          >
            <option value="PRE">{PHASE_LABEL.PRE}</option>
            <option value="POST">{PHASE_LABEL.POST}</option>
          </select>
          <div className="form-text">
            사전(PRE)은 계약 전 점검, 사후(POST)는 잔금/입주 이후 점검 템플릿입니다.
          </div>
        </div>

        {/* POST 그룹 코드 (POST일 때만) */}
        {phase === "POST" && (
          <div className="mb-3">
            <label className="form-label fw-semibold">POST 그룹 코드</label>
            <input
              className="form-control"
              value={postGroupCode}
              onChange={(e) => setPostGroupCode(e.target.value)}
              placeholder="예: POST_A"
            />
            <div className="form-text">사후 체크리스트 분류 코드 (예: POST_A/POST_B...)</div>
          </div>
        )}

        {/* 템플릿명 */}
        <div className="mb-3">
          <label className="form-label fw-semibold">템플릿명</label>
          <input
            className="form-control"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="예: 전세계약 사전 점검 v1"
          />
        </div>

        {/* 설명 */}
        <div className="mb-4">
          <label className="form-label fw-semibold">설명</label>
          <textarea
            className="form-control"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="템플릿 목적/대상/주의사항 등을 간단히 적어주세요."
          />
        </div>

        {/* 하단 버튼 */}
        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/checklists/templates")}>
            취소
          </button>
          <button className="btn btn-primary" disabled={!canSubmit || saving} onClick={onSubmit}>
            <Save size={16} className="me-1" />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
