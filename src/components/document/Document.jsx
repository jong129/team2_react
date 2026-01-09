import React, { useState } from "react";
import { UploadCloud, Image as ImageIcon, Scan, FileText } from "lucide-react";
import { axiosInstance } from "../Tool"; // 경로 맞춰


const Document = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // 🔥 분석 결과
  const memberId = localStorage.getItem("loginMemberId");
  // 이미지 선택
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null); // 새 업로드 시 이전 결과 초기화
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
      formData.append("docType", "CONTRACT");
      formData.append("status", "UPLOADED");

      const res = await fetch("http://121.160.42.81:9093/documents/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("분석 실패");

      // 🔥 FastAPI 문자열 / JSON 모두 대응
      const contentType = res.headers.get("content-type");
      const data =
        contentType && contentType.includes("application/json")
          ? await res.json()
          : await res.text();

      setResult(data);


    } catch (err) {
      console.error(err);
      alert("문서 분석 중 오류 발생");
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
            ) : (
              <div>
                <p>
                  <strong>위험도:</strong> {result.risk_score}%
                </p>

                <p>
                  <strong>요약:</strong> {result.summary}
                </p>

                <ul>
                  {result.reasons?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
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
      `}</style>
    </div>
  );
};

export default Document;
