import React, { useState } from "react";
import { UploadCloud, Image as ImageIcon, Scan, FileText } from "lucide-react";

const Document = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const memberId = localStorage.getItem("loginMemberId");

  // 이미지 선택
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  // 분석 요청
  const handleAnalyze = async () => {
    if (!image) {
      alert("먼저 문서를 업로드해주세요.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file1MF", image);
      formData.append("userId", memberId);
      formData.append("docType", "UNKNOWN");
      formData.append("status", "UPLOADED");

      const res = await fetch("http://121.160.42.21:9093/documents/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // 서버가 에러 메시지를 본문에 담아주는 경우를 위해
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "분석 실패");
      }

      // ✅ content-type 믿지 말고, 일단 text로 받은 후 JSON 파싱 시도
      const raw = await res.text();
      let data = raw;
      try {
        data = JSON.parse(raw);
      } catch {
        // raw가 JSON이 아니면 문자열 그대로 유지
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      alert(`문서 분석 중 오류 발생\n${err?.message ? `(${err.message})` : ""}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light py-5">
      <div className="container" style={{ maxWidth: "900px" }}>
        {/* 📄 업로드 카드 */}
        <div className="card border-0 shadow-lg rounded-5 p-5 mb-4">
          <h2 className="fw-bold text-center mb-4">📄 문서 업로드</h2>

          <label
            className="border border-2 border-dashed rounded-4 p-4 text-center w-100 mb-4"
            style={{ cursor: "pointer", borderColor: "#059669" }}
          >
            <input type="file" accept="image/*" hidden onChange={handleImageChange} />

            {!preview ? (
              <div>
                <UploadCloud size={48} color="#059669" />
                <p className="mt-3 fw-semibold">클릭하여 문서 이미지 업로드</p>
                <p className="text-muted small">(계약서, 등기부등본 등)</p>
              </div>
            ) : (
              <div>
                <img
                  src={preview}
                  alt="미리보기"
                  className="img-fluid rounded-4 mb-3"
                  style={{ maxHeight: "300px" }}
                />
                <p className="small text-muted">
                  <ImageIcon size={16} className="me-1" />
                  이미지 선택 완료
                </p>
              </div>
            )}
          </label>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-emerald w-100 rounded-pill py-3 fw-bold text-white d-flex justify-content-center gap-2"
          >
            <Scan size={20} />
            {loading ? "분석 중..." : "문서 분석하기"}
          </button>
        </div>

        {/* 📊 분석 리포트 */}
        {result && (
          <div className="card border-0 shadow rounded-5 p-5">
            <h3 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <FileText /> 문서 분석 리포트
            </h3>

            <div className="mb-3">
              <span className="badge bg-success me-2">분석 완료</span>
              <span className="badge bg-secondary">AI 분석</span>
            </div>

            <hr />

            {/* 🔍 결과 출력 */}
            {typeof result === "string" ? (
              <p className="text-muted" style={{ whiteSpace: "pre-line" }}>
                {result}
              </p>
            ) : (() => {
              // ✅ analysis가 있든 없든 둘 다 대응
              const a = result?.analysis ?? result;

              const docType = a?.doc_type ?? "-";
              const policyVersion = a?.policy_version ?? "-";
              const riskScore = a?.risk_score ?? null;
              const aiExplanation = a?.ai_explanation ?? "";

              const tone =
                riskScore == null
                  ? "secondary"
                  : riskScore <= 5
                  ? "success"
                  : riskScore <= 15
                  ? "warning"
                  : "danger";

              const riskLabel =
                riskScore == null
                  ? "미산정"
                  : riskScore <= 5
                  ? "낮음"
                  : riskScore <= 15
                  ? "보통"
                  : "높음";

              // 점수 스케일에 맞게 조절: 지금은 0~100 가정
              const progressPct =
                riskScore == null ? 0 : Math.max(0, Math.min(100, Number(riskScore)));

              return (
                <div className="d-flex flex-column gap-4">
                  {/* 상단 KPI 3개 */}
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="border rounded-4 p-3 h-100">
                        <div className="text-muted small">문서 유형</div>
                        <div className="fw-bold fs-4">{docType}</div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="border rounded-4 p-3 h-100">
                        <div className="text-muted small">정책 버전</div>
                        <div className="fw-bold fs-4">{policyVersion}</div>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="border rounded-4 p-3 h-100">
                        <div className="text-muted small">위험 점수</div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="fw-bold fs-4">
                            {riskScore == null ? "-" : `${riskScore}점`}
                          </div>
                          <span className={`badge bg-${tone} rounded-pill`}>{riskLabel}</span>
                        </div>

                        {/* 게이지 */}
                        {riskScore != null && (
                          <div className="progress mt-2" style={{ height: 10 }}>
                            <div
                              className={`progress-bar bg-${tone}`}
                              role="progressbar"
                              style={{ width: `${progressPct}%` }}
                              aria-valuenow={Number(riskScore)}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AI 설명 */}
                  <div className="border rounded-4 p-3">
                    <div className="text-muted small mb-2">AI 설명</div>
                    <div style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>
                      {aiExplanation || "설명 없음"}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 스타일 */}
      <style>{`
        .btn-emerald {
          background-color: #059669;
          border: none;
        }
        .btn-emerald:hover {
          background-color: #047857;
        }
        .border-dashed {
          border-style: dashed !important;
        }
      `}</style>
    </div>
  );
};

export default Document;
