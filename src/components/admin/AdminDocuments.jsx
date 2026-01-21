import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  Calendar,
  User,
  Search,
  ChevronRight,
  Trash2,
  RefreshCw,
} from "lucide-react";

function riskTone(score) {
  if (score === null || score === undefined) return { label: "-", cls: "text-secondary" };
  if (score <= 5) return { label: "낮음", cls: "text-success" };
  if (score <= 15) return { label: "보통", cls: "text-warning" };
  return { label: "높음", cls: "text-danger" };
}

function typeBadgeStyle(docType) {
  switch (docType) {
    case "REGISTRY":
      return "text-bg-success";
    case "BUILDING":
      return "text-bg-secondary";
    case "CONTRACT":
      return "text-bg-primary"; 
    default:
      return "text-bg-light";
  }
}

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatDate(value) {
  if (!value) return "";
  return String(value);
}

function getFilenameFromPath(path) {
  if (!path) return "";
  const parts = String(path).split(/[\\/]/);
  return parts[parts.length - 1] || "";
}

function normalizeBase(base) {
  if (!base) return "";
  return String(base).replace(/\/+$/, "");
}

function joinUrl(base, path) {
  const b = normalizeBase(base);
  const p = String(path || "");
  if (!b) return p;
  if (!p) return b;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return p.startsWith("/") ? `${b}${p}` : `${b}/${p}`;
}

export default function AdminDocuments() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // userId state (localStorage 기반)
  const [userId, setUserId] = useState(() => {
    const raw = localStorage.getItem("loginMemberId");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : "";
  });

  const selected = useMemo(
    () => docs.find((d) => d.docId === selectedId) ?? null,
    [docs, selectedId]
  );

  // ✅ 레포트 존재 여부: DTO에 hasReport 없으니 reportId로 판정
  const hasReport = selected?.reportId != null;

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return docs;
    return docs.filter((d) => {
      // filePath는 검색에는 포함해도 UI 노출은 안 함
      const s = `${d.docId} ${d.userId} ${d.docType} ${d.createdAt ?? ""} ${d.filePath ?? ""}`.toLowerCase();
      return s.includes(keyword);
    });
  }, [docs, q]);

  const reasons = useMemo(() => safeJsonParse(selected?.reasonsJson, []), [selected?.reasonsJson]);
  const parsedData = useMemo(() => safeJsonParse(selected?.parsedJson, {}), [selected?.parsedJson]);

  /**
   * ✅ 이미지 소스 우선순위
   * 1) selected.imagePath / selected.image_path (서버가 내려주는 "/files/파일명")
   * 2) selected.imageUrl / selected.image_url (절대/상대 URL)
   * 3) selected.filePath (윈도우 절대경로일 수도 있으니 파일명만 뽑아서 /files/{filename})
   */
  const imageSrc = useMemo(() => {
    if (!selected) return "";

    const base =
      (import.meta.env.VITE_API_BASE_URL || axiosInstance?.defaults?.baseURL || "").replace(/\/+$/, "");

    const imagePath = selected.imagePath ?? selected.image_path ?? null;
    const imageUrl = selected.imageUrl ?? selected.image_url ?? null;

    let raw = "";

    if (imagePath) raw = imagePath;          // 보통 "/files/제너스빌_302호_3.jpg" 또는 "/files/%EC..."
    else if (imageUrl) raw = imageUrl;       // "http://..." 또는 "/files/..."
    else if (selected.filePath) {
      const filename = getFilenameFromPath(selected.filePath);
      if (filename) raw = `/files/${filename}`;
    }

    if (!raw) return "";

    // base 붙이기 (raw가 절대 URL이면 그대로)
    const full =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : raw.startsWith("/")
          ? `${base}${raw}`
          : `${base}/${raw}`;

    // ✅ 핵심: 이미 인코딩된("%") 경로면 다시 encode 하지 않는다 (double-encoding 방지)
    const safe = full.includes("%") ? full : encodeURI(full);

    return `${safe}?t=${selected.docId ?? Date.now()}`;
  }, [selected]);


  const fetchDocs = async () => {
    if (!userId) {
      setError("userId가 비어있습니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axiosInstance.get("/documents/show", { params: { userId } });
      const arr = Array.isArray(res.data) ? res.data : [];
      setDocs(arr);
      setSelectedId(arr[0]?.docId ?? null);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
      else setError("문서 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 레포트 삭제: /documents/delete/{docId}/report
  const deleteReport = async () => {
    if (!selected?.docId) return;

    if (!hasReport) {
      alert("삭제할 레포트가 없습니다.");
      return;
    }

    const ok = window.confirm(`DOC #${selected.docId} 레포트를 삭제할까요?`);
    if (!ok) return;

    setDeleting(true);
    setError("");

    const url = `/documents/delete/${selected.docId}/report`;
    console.log("DELETE =>", url);

    try {
      await axiosInstance.delete(url);

      // UI 반영: 레포트 필드만 초기화
      setDocs((prev) =>
        prev.map((d) =>
          d.docId === selected.docId
            ? {
              ...d,
              reportId: null,
              policyVersion: null,
              riskScore: null,
              reasonsJson: "[]",
              parsedJson: "{}",
              aiExplanation: null,
              reportCreatedAt: null,
            }
            : d
        )
      );

      alert("레포트를 삭제했습니다.");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
      else if (err.response?.status === 404) setError("삭제할 레포트를 찾지 못했습니다.");
      else setError("레포트 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  // ✅ 문서 삭제
  const deleteDocument = async () => {
    if (!selected?.docId) return;

    const ok = window.confirm(
      `DOC #${selected.docId} 문서를 삭제할까요?\n(레포트가 있으면 같이 삭제되도록 백엔드에서 처리하는 것을 권장)`
    );
    if (!ok) return;

    setDeleting(true);
    setError("");

    const url = `/documents/delete/${selected.docId}/document`;
    console.log("DELETE =>", url);

    try {
      await axiosInstance.delete(url);

      // UI 반영: 목록에서 제거 + 다음 문서 자동 선택
      setDocs((prev) => {
        const next = prev.filter((d) => d.docId !== selected.docId);
        setSelectedId(next[0]?.docId ?? null);
        return next;
      });

      alert("문서를 삭제했습니다.");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
      else if (err.response?.status === 404) setError("삭제할 문서를 찾지 못했습니다.");
      else setError("문서 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            className="btn btn-light rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: 40, height: 40 }}
            onClick={() => navigate("/admin")}
            title="관리자 대시보드"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h2 className="fw-bold m-0">문서 관리</h2>
            <div className="text-secondary small mt-1">userId 기준 문서 + 레포트 조회</div>
          </div>
        </div>

        <div className="d-flex gap-2 align-items-center">
          {/* userId 입력 */}
          <div className="input-group" style={{ width: 240 }}>
            <span className="input-group-text bg-white">userId</span>
            <input
              className="form-control"
              value={userId}
              onChange={(e) => {
                const v = e.target.value;
                setUserId(v === "" ? "" : Number(v));
              }}
              type="number"
              min="1"
            />
          </div>

          <button
            type="button"
            className="btn btn-outline-success d-flex align-items-center gap-2"
            onClick={fetchDocs}
            disabled={loading}
          >
            <RefreshCw size={16} />
            {loading ? "불러오는 중..." : "불러오기"}
          </button>

          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            뒤로
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      <div className="row g-3">
        {/* Left: list */}
        <div className="col-lg-5">
          <div className="border rounded-4 shadow-sm p-3">
            {/* Search */}
            <div className="input-group mb-3">
              <span className="input-group-text bg-white">
                <Search size={16} />
              </span>
              <input
                className="form-control"
                placeholder="docId / userId / type / filePath 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Cards */}
            <div className="d-flex flex-column gap-2" style={{ maxHeight: 640, overflow: "auto" }}>
              {loading ? (
                <div className="text-secondary small p-3">불러오는 중...</div>
              ) : filtered.length === 0 ? (
                <div className="text-secondary small p-3">문서가 없습니다.</div>
              ) : (
                filtered.map((d) => {
                  const active = d.docId === selectedId;
                  const tone = riskTone(d.riskScore);
                  const hasReportRow = d.reportId != null;

                  return (
                    <button
                      key={d.docId}
                      type="button"
                      className={`border rounded-4 p-3 text-start ${active ? "border-success" : "border-light"
                        }`}
                      style={{
                        background: active ? "#ecfdf5" : "white",
                        boxShadow: active ? "0 0 0 0 rgba(0,0,0,0)" : "0 1px 8px rgba(0,0,0,0.06)",
                      }}
                      onClick={() => setSelectedId(d.docId)}
                    >
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div>
                          <div className="fw-bold d-flex align-items-center gap-2">
                            <FileText size={16} />
                            DOC #{d.docId}
                          </div>
                          <div className="text-secondary small mt-1 d-flex align-items-center gap-2">
                            <User size={14} /> userId: {d.userId}
                          </div>
                          <div className="text-secondary small d-flex align-items-center gap-2">
                            <Calendar size={14} /> {formatDate(d.createdAt)}
                          </div>
                        </div>

                        <div className="text-end">
                          <span className={`badge ${typeBadgeStyle(d.docType)}`}>{d.docType}</span>

                          <div className="small mt-2">
                            {hasReportRow ? (
                              <span className={`fw-bold ${tone.cls}`}>
                                위험도 {tone.label}
                                {d.riskScore != null ? ` · ${d.riskScore}점` : ""}
                              </span>
                            ) : (
                              <span className="fw-bold text-secondary">레포트 없음</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-secondary small mt-2" style={{ lineHeight: 1.35 }}>
                        {d.aiExplanation
                          ? d.aiExplanation.slice(0, 60) + (d.aiExplanation.length > 60 ? "..." : "")
                          : "요약 없음"}
                      </div>

                      <div className="d-flex align-items-center justify-content-end mt-2 text-secondary small">
                        상세 보기 <ChevronRight size={16} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: detail */}
        <div className="col-lg-7">
          <div className="border rounded-4 shadow-sm p-4">
            {!selected ? (
              <div className="text-secondary">선택된 문서가 없습니다.</div>
            ) : (
              <>
                {/* Top: title + delete */}
                <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                  <div>
                    <div className="fw-bold fs-4">DOC #{selected.docId}</div>
                    <div className="text-secondary small mt-1">
                      userId: {selected.userId} · type: {selected.docType}
                    </div>
                    <div className="text-secondary small">{formatDate(selected.createdAt)}</div>
                  </div>

                  <div className="d-flex flex-column align-items-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-danger d-flex align-items-center gap-2"
                      onClick={deleteReport}
                      disabled={deleting || !hasReport}
                      title={!hasReport ? "삭제할 레포트가 없습니다" : "레포트 삭제"}
                    >
                      <Trash2 size={16} />
                      {deleting ? "처리 중..." : "레포트 삭제"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-danger d-flex align-items-center gap-2"
                      onClick={deleteDocument}
                      disabled={deleting || !selected?.docId}
                      title={!selected?.docId ? "문서를 선택하세요" : "문서 삭제"}
                    >
                      <Trash2 size={16} />
                      {deleting ? "처리 중..." : "문서 삭제"}
                    </button>

                    <div className="text-end">
                      <div className="text-secondary small">policy</div>
                      <div className="fw-bold">{selected.policyVersion || "-"}</div>
                    </div>
                  </div>
                </div>

                <hr />

                {/* Image */}
                <div className="mb-4">
                  <div className="fw-bold mb-2 d-flex align-items-center gap-2">
                    <ImageIcon size={18} /> 문서 이미지
                  </div>

                  <div className="border rounded-4 overflow-hidden" style={{ background: "#f8fafc" }}>
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={`doc-${selected.docId}`}
                        style={{ width: "100%", height: "auto", display: "block" }}
                        onError={(e) => {
                          // 실패 시 안내 문구
                          e.currentTarget.style.display = "none";
                          const box = e.currentTarget.parentElement;
                          if (box && !box.querySelector("[data-img-fail]")) {
                            const div = document.createElement("div");
                            div.setAttribute("data-img-fail", "1");
                            div.className = "p-3 text-secondary small";
                            div.innerText = "이미지를 불러올 수 없습니다.";
                            box.appendChild(div);
                          }
                        }}
                      />
                    ) : (
                      <div className="p-3 text-secondary small">이미지가 없습니다.</div>
                    )}
                  </div>
                </div>

                {/* Report */}
                <div className="d-flex flex-column gap-3">
                  <div className="border rounded-4 p-3">
                    <div className="fw-bold mb-2 d-flex align-items-center gap-2">
                      <ShieldAlert size={18} /> AI 레포트
                    </div>

                    {!hasReport ? (
                      <div className="text-secondary">레포트가 없습니다.</div>
                    ) : (
                      <div style={{ whiteSpace: "pre-wrap" }}>{selected.aiExplanation || "설명 없음"}</div>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="border rounded-4 p-3">
                        <div className="text-secondary small">Risk Score</div>
                        <div className="fw-bold fs-4">
                          {selected.riskScore == null ? "-" : `${selected.riskScore}점`}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border rounded-4 p-3">
                        <div className="text-secondary small">Doc Type</div>
                        <div className="fw-bold fs-4">{selected.docType}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-4 p-3">
                    <div className="text-secondary small mb-2">Reasons</div>
                    {Array.isArray(reasons) && reasons.length > 0 ? (
                      <ul className="mb-0">
                        {reasons.map((r, idx) => (
                          <li key={idx}>{typeof r === "string" ? r : JSON.stringify(r)}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-secondary small">없음</div>
                    )}
                  </div>

                  <div className="border rounded-4 p-3">
                    <div className="text-secondary small mb-2">Parsed Data</div>
                    <pre className="mb-0" style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(parsedData, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
