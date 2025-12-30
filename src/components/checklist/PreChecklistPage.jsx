import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function PreChecklistPage() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // itemId -> "DONE" | "NOT_DONE"
  const [checks, setChecks] = useState({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:9093/checklists/pre/active");
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `조회 실패 (${res.status})`);
        }

        const json = await res.json();
        setData(json);

        // 기본값 미진행
        const init = {};
        (json.items || []).forEach((it) => (init[it.itemId] = "NOT_DONE"));
        setChecks(init);
      } catch (e) {
        setError(e?.message ?? "알 수 없는 오류");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const progress = useMemo(() => {
    const total = data?.items?.length ?? 0;
    const done = Object.values(checks).filter((v) => v === "DONE").length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, pct };
  }, [data, checks]);

  const setDone = (itemId) => setChecks((prev) => ({ ...prev, [itemId]: "DONE" }));
  const setNotDone = (itemId) => setChecks((prev) => ({ ...prev, [itemId]: "NOT_DONE" }));

  const resetAll = () => {
    const reset = {};
    (data?.items || []).forEach((it) => (reset[it.itemId] = "NOT_DONE"));
    setChecks(reset);
  };

  if (loading) {
    return (
      <div className="bg-white" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="container py-5">
          <div className="p-4 rounded-5 shadow-sm border text-center">
            불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="container py-5">
          <div className="p-4 rounded-5 shadow-sm border text-danger">
            에러: {error}
          </div>
          <button className="btn btn-outline-secondary mt-3" onClick={() => navigate("/checklist")}>
            ← 체크리스트 홈
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="container py-5">
          <div className="p-4 rounded-5 shadow-sm border">데이터 없음</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 상단 바 (Home 느낌) */}
      <nav className="navbar navbar-light bg-white border-bottom sticky-top py-3 shadow-sm">
        <div className="container d-flex align-items-center justify-content-between">
          <button
            className="btn btn-sm btn-outline-secondary rounded-pill"
            onClick={() => navigate("/checklist")}
          >
            <ArrowLeft size={16} className="me-1" />
            체크리스트 홈
          </button>

          <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: "#059669" }}>
            <ClipboardCheck className="me-1" />
            사전 체크리스트
          </div>

          <div className="d-none d-md-flex align-items-center gap-2">
            <span className="small text-muted">진행률</span>
            <span className="fw-bold">
              {progress.done}/{progress.total} ({progress.pct}%)
            </span>
          </div>
        </div>
      </nav>

      {/* 헤더 섹션 (Home hero 톤) */}
      <section className="py-5 position-relative" style={{ backgroundColor: "#f8fafc" }}>
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backgroundColor: "#ecfdf5",
            clipPath: "polygon(0px 0px, 100% 0px, 100% 80%, 0% 100%)",
            zIndex: 0,
          }}
        />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="text-center">
                <span
                  className="d-inline-block py-1 px-3 rounded-pill bg-white fw-bold shadow-sm mb-3 border"
                  style={{ color: "#059669", borderColor: "#d1fae5" }}
                >
                  📝 계약 전 필수 점검
                </span>

                <h1 className="fw-extrabold mb-3 lh-base text-dark" style={{ fontSize: "2.2rem" }}>
                  {data.templateName || "사전 체크리스트"}
                </h1>

                <p className="text-secondary mb-4 mx-auto fw-medium" style={{ maxWidth: 720 }}>
                  계약 전에 놓치기 쉬운 핵심 항목을 한 번에 점검하세요.
                  진행 상태는 현재 프론트에서만 임시 저장됩니다.
                </p>

                {/* 진행률 바 */}
                <div className="bg-white rounded-5 shadow-sm border p-3 text-start mx-auto" style={{ maxWidth: 720 }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="fw-bold" style={{ color: "#059669" }}>
                      진행률
                    </div>
                    <div className="fw-bold">
                      {progress.done}/{progress.total} ({progress.pct}%)
                    </div>
                  </div>

                  <div className="progress" style={{ height: 10 }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{ width: `${progress.pct}%`, backgroundColor: "#059669" }}
                      aria-valuenow={progress.pct}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    />
                  </div>

                  <div className="small text-muted mt-2">
                    완료한 항목은 “진행 완료”에 체크하세요.
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="d-flex justify-content-center gap-2 mt-4">
                  <button className="btn btn-outline-emerald rounded-pill fw-bold px-4" onClick={resetAll}>
                    초기화
                  </button>
                  <button
                    className="btn btn-emerald rounded-pill fw-bold px-4 text-white"
                    onClick={() => alert("저장 기능은 다음 단계에서 붙입니다.")}
                  >
                    저장(추후)
                  </button>
                </div>

                <div className="small text-muted mt-2">
                  <CheckCircle2 size={16} className="me-1" color="#059669" />
                  체크리스트 항목은 DB의 ACTIVE 템플릿 기준으로 자동 노출됩니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 테이블 섹션 */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered align-middle text-center mb-0">
                  <thead style={{ background: "#e5e7eb" }}>
                    <tr>
                      <th style={{ width: "18%" }}>확인 영역</th>
                      <th>확인 항목</th>
                      <th style={{ width: "10%" }}>
                        진행<br />완료
                      </th>
                      <th style={{ width: "10%" }}>미진행</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(data.items || []).map((item) => {
                      const area = item.checkArea || "사전 점검";
                      const status = checks[item.itemId] || "NOT_DONE";

                      return (
                        <tr key={item.itemId}>
                          <td className="fw-semibold">{area}</td>

                          <td className="text-start px-3">
                            <div className="fw-semibold">{item.title}</div>
                            {item.description && (
                              <div className="text-muted small mt-1">{item.description}</div>
                            )}
                          </td>

                          <td>
                            <input
                              type="checkbox"
                              checked={status === "DONE"}
                              onChange={(e) =>
                                e.target.checked ? setDone(item.itemId) : setNotDone(item.itemId)
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="checkbox"
                              checked={status === "NOT_DONE"}
                              onChange={(e) =>
                                e.target.checked ? setNotDone(item.itemId) : setDone(item.itemId)
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 모바일 진행률 표시(상단에서 안 보이는 경우 대비) */}
          <div className="d-md-none mt-3 text-center">
            <span className="small text-muted me-2">진행률</span>
            <span className="fw-bold">
              {progress.done}/{progress.total} ({progress.pct}%)
            </span>
          </div>
        </div>
      </section>

      {/* 페이지 전용 CSS (Home의 emerald 톤 그대로) */}
      <style>{`
        .btn-emerald { background-color: #059669; border: none; transition: all 0.3s; }
        .btn-emerald:hover { background-color: #047857; transform: translateY(-2px); }
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.3s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
      `}</style>
    </div>
  );
}
