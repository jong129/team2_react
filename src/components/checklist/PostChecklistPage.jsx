import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipboardCheck, ArrowLeft } from "lucide-react";
import { axiosInstance } from "../Tool";

export default function PostChecklistPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState(null);        // { sessionId, templateId, templateName, items: [...] }
  const [session, setSession] = useState(null);  // { sessionId }
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [checks, setChecks] = useState({});

  const memberId = Number(localStorage.getItem("loginMemberId")) || 0;

  // ✅ 들어온 sessionId는 숫자로 강제
  const incomingSessionIdRaw = location?.state?.sessionId ?? null;
  const incomingSessionId = incomingSessionIdRaw != null ? Number(incomingSessionIdRaw) : null;

  // ✅ 응답 포맷이 {data:{...}}든 {...}든 안전하게 언랩
  const unwrap = (res) => res?.data?.data ?? res?.data ?? null;

  const startPostSession = async (mid) => {
    const res = await axiosInstance.post("/checklists/post/session/start", null, {
      params: { memberId: mid },
    });
    return unwrap(res);
  };

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

  const loadSummary = async (sessionId) => {
    const res = await axiosInstance.get(`/checklists/post/session/${sessionId}/summary`);
    return unwrap(res);
  };

  const hydrateChecks = async (tplItems, sessId) => {
    const init = {};
    (tplItems || []).forEach((it) => (init[it.itemId] = "NOT_DONE"));

    const statuses = await loadStatuses(sessId);
    (statuses || []).forEach((s) => {
      init[s.itemId] = s.checkStatus;
    });

    setChecks(init);
  };

  const completeSession = async (sessionId) => {
    await axiosInstance.patch(`/checklists/post/session/${sessionId}/complete`);
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        if (!memberId) {
          alert("로그인이 필요합니다.");
          navigate("/member_login");
          return;
        }

        // 1) session 결정
        let sess;
        if (incomingSessionId && !Number.isNaN(incomingSessionId)) {
          sess = { sessionId: incomingSessionId };
        } else {
          const created = await startPostSession(memberId);
          if (!created?.sessionId) throw new Error("POST 세션 생성 응답에 sessionId가 없습니다.");
          sess = { sessionId: Number(created.sessionId) };

          // ✅ 새 세션이면 state에 고정(새로고침/뒤로가기 꼬임 방지)
          navigate(location.pathname, { replace: true, state: { sessionId: sess.sessionId } });
        }

        if (!alive) return;
        setSession(sess);

        // 2) template+items 로드
        const tpl = await loadPostChecklist(sess.sessionId);
        if (!tpl) throw new Error("체크리스트 응답이 비어있습니다.");

        // ✅ items가 혹시 다른 위치에 있으면 fallback
        const tplItems = tpl.items || tpl?.data?.items || [];
        const normalized = { ...tpl, items: tplItems };

        if (!alive) return;
        setData(normalized);

        // 3) summary optional
        try {
          const sum = await loadSummary(sess.sessionId);
          if (alive) setSummary(sum);
        } catch {
          if (alive) setSummary(null);
        }

        // 4) 체크맵 동기화
        await hydrateChecks(tplItems, sess.sessionId);
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.response?.data ||
          e?.message ||
          "알 수 없는 오류";
        if (alive) setError(String(msg));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, incomingSessionId]);

  const progress = useMemo(() => {
    const total = data?.items?.length ?? 0;
    const done = Object.values(checks).filter((v) => v === "DONE").length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, pct };
  }, [data, checks]);

  const requiredLeft = useMemo(() => {
    const items = data?.items || [];
    const requiredItems = items.filter((it) => it.requiredYn === "Y");

    const left = requiredItems.filter((it) => {
      const st = checks[it.itemId] || "NOT_DONE";
      return st === "NOT_DONE";
    }).length;

    return { requiredTotal: requiredItems.length, requiredLeft: left };
  }, [data, checks]);

  const canComplete = useMemo(() => {
    return requiredLeft.requiredLeft === 0 && (data?.items?.length ?? 0) > 0;
  }, [requiredLeft, data]);

  const applyStatus = async (itemId, nextStatus) => {
    if (!session?.sessionId) return;

    try {
      setSaving(true);
      setError("");

      setChecks((prev) => ({ ...prev, [itemId]: nextStatus }));
      await saveCheckStatus(session.sessionId, itemId, nextStatus);

      try {
        const sum = await loadSummary(session.sessionId);
        setSummary(sum);
      } catch { }
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

    if (!canComplete) {
      alert("필수 항목을 먼저 완료 처리해주세요.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await completeSession(session.sessionId);

      alert("사후 체크리스트를 완료했습니다.");
      navigate("/checklist/history", { state: { phase: "POST" } });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "완료 처리 중 오류";
      setError(String(msg));
    } finally {
      setSaving(false);
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
          ← 체크리스트 홈
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
            <ArrowLeft size={16} className="me-1" />
            체크리스트 홈
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

              {summary && (
                <div className="p-4 border-top">
                  <div className="fw-bold mb-1" style={{ color: "#059669" }}>요약</div>
                  <div className="small text-muted">
                    <b>{summary.level}</b> - {summary.message}
                  </div>
                </div>
              )}

              <div className="p-4 border-top bg-white">
                <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
                  <div>
                    <div className="fw-bold mb-1" style={{ color: "#059669" }}>진행 요약</div>
                    <div className="small text-muted">
                      전체 진행률: <b>{progress.pct}%</b> ({progress.done}/{progress.total})
                      <br />
                      필수 미완료: <b>{requiredLeft.requiredLeft}</b> / {requiredLeft.requiredTotal}
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-secondary rounded-pill px-4"
                      disabled={saving}
                      onClick={() => navigate("/checklist")}
                    >
                      나중에 할게요
                    </button>

                    <button
                      className="btn btn-success rounded-pill px-4"
                      disabled={saving || !canComplete}
                      onClick={() => navigate("/checklist")}
                      title={!canComplete ? "필수 항목을 먼저 완료 처리해주세요." : ""}
                    >
                      완료하기
                    </button>
                  </div>
                </div>

                {!canComplete && (
                  <div className="small text-danger mt-2">
                    * 필수 항목이 남아있어서 아직 완료할 수 없어요.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
