import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardCheck, ArrowLeft } from "lucide-react";
import { axiosInstance } from "../Tool";

export default function PostChecklistPage() {
  const navigate = useNavigate();
  const { postSessionId } = useParams();
  const numericPostSessionId = postSessionId ? Number(postSessionId) : null;

  const [data, setData] = useState(null);        // { sessionId, templateId, templateName, items: [...] }
  const [session, setSession] = useState(null);  // { sessionId }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [checks, setChecks] = useState({});

  const [showSat, setShowSat] = useState(false);
  const [satRating, setSatRating] = useState(5);
  const [satComment, setSatComment] = useState("");
  const [satSubmitting, setSatSubmitting] = useState(false);

  const [aiReview, setAiReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const memberId = Number(localStorage.getItem("loginMemberId")) || 0;

  // ✅ 응답 포맷이 {data:{...}}든 {...}든 안전하게 언랩
  const unwrap = (res) => res?.data?.data ?? res?.data ?? null;

  const loadPostChecklist = async (sessionId) => {
    const res = await axiosInstance.get(`/checklists/post/session/${sessionId}`);
    return unwrap(res);
  };

  const loadStatuses = async (sessionId) => {
    const res = await axiosInstance.get(`/checklists/post/session/${sessionId}/statuses`);
    return unwrap(res);
  };

  const saveCheckStatus = async (sessionId, itemId, checkStatus) => {
    await axiosInstance.patch(`/checklists/post/session/${sessionId}/items/${itemId}`, {
      checkStatus,
    });
  };


  const hydrateChecks = async (tplItems, sessId) => {
    const statuses = await loadStatuses(sessId);

    setChecks(prev => {
      const next = { ...prev };

      (statuses || []).forEach(s => {
        // ✅ 이미 사용자가 바꾼 값은 존중
        if (next[s.itemId] == null || next[s.itemId] === "NOT_DONE") {
          next[s.itemId] = s.checkStatus;
        }
      });

      return next;
    });
  };


  const completeSession = async (sessionId) => {
    await axiosInstance.patch(`/checklists/post/session/${sessionId}/complete`);
  };

  const loadSatisfaction = async (sessionId) => {
    const res = await axiosInstance.get(`/checklists/post/session/${sessionId}/satisfaction`);
    return unwrap(res);
  };

  const saveSatisfaction = async (sessionId, rating, commentText) => {
    await axiosInstance.post(`/checklists/post/session/${sessionId}/satisfaction`, {
      rating,
      commentText,
    });
  };


  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        if (!memberId) {
          navigate("/login");
          return;
        }

        if (!numericPostSessionId) {
          setError("잘못된 접근입니다.");
          return;
        }

        const sess = { sessionId: numericPostSessionId };
        setSession(sess);

        // 1️⃣ 템플릿 + 항목만 로드
        const tpl = await loadPostChecklist(sess.sessionId);
        const tplItems = tpl?.items || [];

        if (!alive) return;

        setData({ ...tpl, items: tplItems });

        // ✅ 기본 체크 상태 먼저 세팅
        const init = {};
        tplItems.forEach(it => init[it.itemId] = "NOT_DONE");
        setChecks(init);

        // ✅ 항목만 있으면 바로 화면 표시
        setLoading(false);

        // 2️⃣ 상태는 뒤에서 비동기
        hydrateChecks(tplItems, sess.sessionId);

      } catch (e) {
        if (alive) {
          setError(
            e?.response?.data?.message ||
            e?.message ||
            "알 수 없는 오류"
          );
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [memberId, numericPostSessionId]);


  useEffect(() => {
    if (aiReview) {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [aiReview]);

  const progress = useMemo(() => {
    const total = data?.items?.length ?? 0;
    const done = Object.values(checks).filter(v => v === "DONE").length;
    const notDone = Object.values(checks).filter(v => v === "NOT_DONE").length;

    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, notDone, pct };
  }, [data, checks]);

  const canComplete = useMemo(() => {
    return progress.notDone === 0 && progress.total > 0;
  }, [progress]);


  const applyStatus = async (itemId, nextStatus) => {
    if (!session?.sessionId) return;

    try {
      setSaving(true);
      setError("");

      setChecks((prev) => ({ ...prev, [itemId]: nextStatus }));
      await saveCheckStatus(session.sessionId, itemId, nextStatus);

    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "저장 중 오류";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const onComplete = async () => {
    if (!session?.sessionId) return;

    if (progress.notDone > 0) {
      alert("미완료 항목이 있어 완료할 수 없습니다.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // 1) 완료 처리
      await completeSession(session.sessionId);

      // 2) 이미 만족도 있으면 바로 이동 (중복 방지)
      const existing = await loadSatisfaction(session.sessionId);
      if (existing && existing.rating) {
        alert("사후 체크리스트를 완료했습니다.");
        navigate("/checklist/history", { state: { phase: "POST" } });
        return;
      }

      // 3) 만족도 없으면 모달 띄우기
      setShowSat(true);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "완료 처리 중 오류";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const runAiReview = async () => {
    if (!session?.sessionId) return;

    try {
      setReviewLoading(true);

      const res = await axiosInstance.get(
        `/checklists/post/session/${session.sessionId}/review`
      );

      setAiReview(unwrap(res));

    } catch (e) {
      alert(
        e?.response?.data?.message ||
        "AI 상태 분석 중 오류가 발생했습니다."
      );
    } finally {
      setReviewLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="p-4 rounded-5 shadow-sm border text-center">불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="p-4 rounded-5 shadow-sm border text-danger">에러: {String(error)}</div>
        <button className="btn btn-outline-secondary mt-3" onClick={() => navigate("/checklist")}>
          뒤로가기
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white overflow-hidden" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <nav className="navbar navbar-light bg-white border-bottom sticky-top py-3 shadow-sm">
        <div className="container d-flex align-items-center justify-content-between">
          <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => navigate("/checklist")}>
            뒤로가기
          </button>

          <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: "#059669" }}>
            <ClipboardCheck className="me-1" />
            사후 체크리스트
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">진행률</span>
            <span className="fw-bold">
              {progress.done}/{progress.total} ({progress.pct}%)
            </span>
          </div>
        </div>
      </nav>

      {data?.postGroupCode && (
        <div className="mb-3 text-center">
          <span className={`badge rounded-pill px-3 py-2 ${data.postGroupCode === "POST_B"
            ? "bg-danger"
            : "bg-success"
            }`}>
            {data.postGroupCode === "POST_B"
              ? "⚠️ 위험 점검 사후 체크리스트"
              : "✅ 일반 사후 체크리스트"}
          </span>
        </div>
      )}

      <section className="py-5 bg-white">
        <div className="container">
          <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered align-middle text-center mb-0">
                  <thead style={{ background: "#e5e7eb" }}>
                    <tr>
                      <th style={{ width: "18%" }}>단계</th>
                      <th>확인 항목</th>
                      <th style={{ width: "10%" }}>완료</th>
                      <th style={{ width: "10%" }}>미완료</th>
                      <th style={{ width: "12%" }}>해당없음</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(data.items || []).map((item) => {
                      const status = checks[item.itemId] || "NOT_DONE";
                      const name = `post-${item.itemId}`;

                      return (
                        <tr key={item.itemId}>
                          <td className="fw-semibold">{item.checkArea || "-"}</td>

                          <td className="text-start px-3">
                            <div className="fw-semibold">{item.title}</div>
                            {item.description && <div className="text-muted small mt-1">{item.description}</div>}
                          </td>

                          <td>
                            <input
                              type="radio"
                              name={name}
                              checked={status === "DONE"}
                              disabled={saving}
                              onChange={() => applyStatus(item.itemId, "DONE")}
                            />
                          </td>

                          <td>
                            <input
                              type="radio"
                              name={name}
                              checked={status === "NOT_DONE"}
                              disabled={saving}
                              onChange={() => applyStatus(item.itemId, "NOT_DONE")}
                            />
                          </td>

                          <td>
                            <input
                              type="radio"
                              name={name}
                              checked={status === "NOT_REQUIRED"}
                              disabled={saving}
                              onChange={() => applyStatus(item.itemId, "NOT_REQUIRED")}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-top bg-white">
                <div className="bg-white rounded-5 shadow-sm border p-4">
                  <div className="mb-3">
                    <div className="fw-bold mb-2" style={{ color: "#059669" }}>
                      진행률
                    </div>

                    <div className="progress" style={{ height: 10 }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${progress.pct}%`,
                          backgroundColor: "#059669"
                        }}
                        aria-valuenow={progress.pct}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>

                    <div className="small text-muted mt-2">
                      완료: <b>{progress.done}</b> / {progress.total}
                    </div>

                    {progress.notDone > 0 && (
                      <div className="small text-danger mt-2">
                        미완료 항목이 존재해 체크리스트를 완료하실 수 없어요.
                      </div>
                    )}

                  </div>

                  <div className="d-flex justify-content-end gap-2">

                    <button
                      className="btn btn-outline-emerald rounded-pill px-4"
                      disabled={reviewLoading}
                      onClick={runAiReview}
                    >
                      {reviewLoading ? "AI 분석 중..." : "AI로 현재 상태 확인하기"}
                    </button>

                    <button
                      className="btn btn-outline-secondary rounded-pill px-4"
                      onClick={() => navigate("/checklist")}
                      disabled={saving}
                    >
                      나중에 할게요
                    </button>

                    <button
                      className="btn btn-success rounded-pill px-4"
                      disabled={saving || !canComplete}
                      onClick={onComplete}
                    >
                      완료하기
                    </button>
                  </div>
                </div>
                {aiReview && (
                  <div className="mt-4 rounded-5 border shadow-sm p-4 bg-light">

                    <div className="fw-bold mb-2" style={{ color: "#059669" }}>
                      🤖 AI 현재 상태 분석
                    </div>

                    <div className="text-muted mb-3">
                      {aiReview.summary}
                    </div>

                    {aiReview.items && aiReview.items.length > 0 && (
                      <ul className="list-unstyled mb-0">
                        {aiReview.items.map((it, idx) => (
                          <li
                            key={it.itemId}
                            className="mb-3 pb-3 border-bottom"
                          >
                            <div className="fw-semibold">
                              {idx + 1}. {it.title}
                            </div>

                            {it.reason && (
                              <div className="small text-muted mt-1">
                                • 위험 사유: {it.reason}
                              </div>
                            )}

                            {it.action && (
                              <div className="small text-primary mt-1">
                                • 권장 조치: {it.action}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {aiReview.items?.length === 0 && (
                      <div className="text-success small">
                        현재 미완료 항목이 없습니다.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      {showSat && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.35)", zIndex: 1050 }}
        >
          <div className="bg-white rounded-5 shadow p-4" style={{ width: "min(520px, 92vw)" }}>
            <div className="fw-bold mb-2" style={{ color: "#059669" }}>만족도 조사</div>
            <div className="text-muted small mb-3">
              체크리스트가 도움이 되었나요? (최초 완료 시 1회만 저장됩니다)
            </div>

            <div className="d-flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn ${satRating === n ? "btn-success" : "btn-outline-success"} rounded-pill`}
                  onClick={() => setSatRating(n)}
                  disabled={satSubmitting}
                >
                  {n}점
                </button>
              ))}
            </div>

            <textarea
              className="form-control rounded-4"
              rows={3}
              placeholder="(선택) 느낀 점을 한 줄로 남겨주세요"
              value={satComment}
              onChange={(e) => setSatComment(e.target.value)}
              disabled={satSubmitting}
            />

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                className="btn btn-outline-secondary rounded-pill"
                disabled={satSubmitting}
                onClick={() => {
                  setShowSat(false);
                  navigate("/checklist/history", { state: { phase: "POST" } });
                }}
              >
                건너뛰기
              </button>

              <button
                className="btn btn-success rounded-pill"
                disabled={satSubmitting}
                onClick={async () => {
                  try {
                    setSatSubmitting(true);
                    await saveSatisfaction(session.sessionId, satRating, satComment);
                    setShowSat(false);
                    alert("만족도 저장 완료!");
                    navigate("/checklist/history", { state: { phase: "POST" } });
                  } catch (e) {
                    alert(e?.response?.data?.message || e?.message || "만족도 저장 실패");
                  } finally {
                    setSatSubmitting(false);
                  }
                }}
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
