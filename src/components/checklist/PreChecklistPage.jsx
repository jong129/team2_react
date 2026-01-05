import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipboardCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { axiosInstance } from "../Tool";

export default function PreChecklistPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [checks, setChecks] = useState({});

  // ✅ 저장 완료 토스트
  const [savedNotice, setSavedNotice] = useState(false);
  const saveTimerRef = useRef(null);

  // ✅ 로그인 사용자
  const memberId = Number(localStorage.getItem("loginMemberId"));

  // ✅ ChecklistHome에서 넘겨준 sessionId (있으면 재사용)
  const incomingSessionId = location?.state?.sessionId ?? null;

  const startSession = async (mid) => {
    const res = await axiosInstance.post("/checklists/pre/session/start", null, {
      params: { memberId: mid },
    });
    return res.data;
  };

  const loadTemplate = async () => {
    const res = await axiosInstance.get("/checklists/pre/active");
    return res.data;
  };

  const loadSummary = async (sessionId) => {
    const res = await axiosInstance.get(`/checklists/pre/session/${sessionId}/summary`);
    return res.data;
  };

  // ✅ (F) 이어하기용: 세션 저장 상태 목록 조회
  const loadStatuses = async (sessionId) => {
    const res = await axiosInstance.get(`/checklists/pre/session/${sessionId}/statuses`);
    return res.data; // [{ itemId, checkStatus }]
  };

  const saveCheckStatus = async (sessionId, itemId, checkStatus) => {
    await axiosInstance.patch(`/checklists/pre/session/${sessionId}/items/${itemId}`, {
      checkStatus,
    });
  };

  const resetSession = async (sessionId) => {
    await axiosInstance.post(`/checklists/pre/session/${sessionId}/reset`);
  };

  // ✅ 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ✅ 체크맵 동기화 함수(중복 제거)
  const hydrateChecks = async (tpl, sessId) => {
    const init = {};
    (tpl.items || []).forEach((it) => (init[it.itemId] = "NOT_DONE"));

    // 서버 저장값 덮어쓰기
    const statuses = await loadStatuses(sessId);
    (statuses || []).forEach((s) => {
      init[s.itemId] = s.checkStatus; // DONE / NOT_DONE / NOT_REQUIRED
    });

    setChecks(init);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        if (!memberId) {
          alert("로그인이 필요합니다.");
          navigate("/member_login");
          return;
        }

        // 1) 템플릿
        const tpl = await loadTemplate();
        setData(tpl);

        // 2) 세션: state로 받은 sessionId가 있으면 그걸 사용, 없으면 start 호출
        let sess;
        if (incomingSessionId) {
          sess = { sessionId: incomingSessionId }; // 최소한 sessionId만 있어도 됨
        } else {
          sess = await startSession(memberId);
        }
        setSession(sess);

        // 3) 요약
        const sum = await loadSummary(sess.sessionId);
        setSummary(sum);

        // 4) 체크맵: 서버 statuses로 동기화 (이어하기 해결 핵심)
        await hydrateChecks(tpl, sess.sessionId);
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data ||
          e?.message ||
          "알 수 없는 오류";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
    // ✅ incomingSessionId가 바뀌면 다시 로드되도록 포함
  }, [navigate, memberId, incomingSessionId]);

  const progress = useMemo(() => {
    const total = summary?.totalCount ?? data?.items?.length ?? 0;
    const done = summary?.doneCount ?? Object.values(checks).filter((v) => v === "DONE").length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, pct };
  }, [data, checks, summary]);

  const applyStatus = async (itemId, nextStatus) => {
    if (!session?.sessionId) {
      setError("세션이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // UI 선반영
      setChecks((prev) => ({ ...prev, [itemId]: nextStatus }));

      // 서버 저장
      await saveCheckStatus(session.sessionId, itemId, nextStatus);

      // 요약 갱신
      const sum = await loadSummary(session.sessionId);
      setSummary(sum);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "저장 중 오류";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const setDone = (itemId) => applyStatus(itemId, "DONE");
  const setNotDone = (itemId) => applyStatus(itemId, "NOT_DONE");

  const resetAll = async () => {
    if (!session?.sessionId) {
      setError("세션이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await resetSession(session.sessionId);

      // 요약 다시 로드
      const sum = await loadSummary(session.sessionId);
      setSummary(sum);

      // ✅ reset 후에도 statuses로 다시 동기화(서버가 진짜 소스)
      await hydrateChecks(data, session.sessionId);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "초기화 중 오류";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ✅ 저장 버튼 액션: 토스트 띄우고 1.5초 뒤 이동
  const handleSaveExit = () => {
    setSavedNotice(true);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      navigate("/checklist#checklist");
    }, 1500);
  };

  if (loading) {
    return (
      <div className="bg-white" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="container py-5">
          <div className="p-4 rounded-5 shadow-sm border text-center">불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="container py-5">
          <div className="p-4 rounded-5 shadow-sm border text-danger">에러: {String(error)}</div>
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

  const requiredNotDone = summary?.requiredNotDoneItems ?? [];

  return (
    <div className="bg-white overflow-hidden" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* ✅ 저장 완료 토스트 */}
      {savedNotice && (
        <div
          className="position-fixed top-0 start-50 translate-middle-x mt-3 px-4 py-3 rounded-pill shadow-lg fw-bold"
          style={{
            backgroundColor: "#059669",
            color: "white",
            zIndex: 2000,
          }}
        >
          ✅ 체크리스트가 저장되었습니다
        </div>
      )}

      {/* 상단 바 */}
      <nav className="navbar navbar-light bg-white border-bottom sticky-top py-3 shadow-sm">
        <div className="container d-flex align-items-center justify-content-between">
          <button className="btn btn-sm btn-outline-secondary rounded-pill" onClick={() => navigate("/checklist")}>
            <ArrowLeft size={16} className="me-1" />
            체크리스트 홈
          </button>

          <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: "#059669" }}>
            <ClipboardCheck className="me-1" />
            사전 체크리스트
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">진행률</span>
            <span className="fw-bold">
              {progress.done}/{progress.total} ({progress.pct}%)
            </span>
          </div>
        </div>
      </nav>

      {/* 헤더 */}
      <section className="py-4 position-relative" style={{ backgroundColor: "#f8fafc" }}>
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
            <div className="col-lg-10 text-center">
              <span
                className="d-inline-block py-1 px-3 rounded-pill bg-white fw-bold shadow-sm mb-3 border"
                style={{ color: "#059669", borderColor: "#d1fae5" }}
              >
                📝 계약 전 필수 점검
              </span>

              <h1 className="fw-extrabold mb-2 lh-base text-dark" style={{ fontSize: "2.0rem" }}>
                {data.templateName || "사전 체크리스트"}
              </h1>

              <p className="text-secondary mb-0 mx-auto fw-medium" style={{ maxWidth: 720 }}>
                표에서 항목을 체크한 뒤, 아래에서 요약/경고를 확인하세요.
                {session?.sessionId ? (
                  <span className="ms-2 small text-muted">(sessionId: {session.sessionId})</span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 표 */}
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
                            {item.description && <div className="text-muted small mt-1">{item.description}</div>}
                          </td>

                          <td>
                            <input
                              type="checkbox"
                              checked={status === "DONE"}
                              disabled={saving}
                              onChange={(e) => (e.target.checked ? setDone(item.itemId) : setNotDone(item.itemId))}
                            />
                          </td>

                          <td>
                            <input
                              type="checkbox"
                              checked={status === "NOT_DONE"}
                              disabled={saving}
                              onChange={(e) => (e.target.checked ? setNotDone(item.itemId) : setDone(item.itemId))}
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

          {/* 요약 + 진행률 + 버튼 */}
          <div className="mt-4 mx-auto" style={{ maxWidth: 920 }}>
            <div className="bg-white rounded-5 shadow-sm border p-4">
              {summary && (
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="fw-bold" style={{ color: "#059669" }}>
                      요약
                    </div>
                    {saving && <div className="small text-muted">처리중...</div>}
                  </div>

                  <div className="small">
                    <span className="fw-bold">{summary.level}</span> - {summary.message}
                  </div>

                  {requiredNotDone.length > 0 && (
                    <div className="mt-2">
                      <div className="fw-bold small mb-1">필수 미완료 ({summary.requiredNotDoneCount})</div>
                      <ul className="small text-muted mb-0 ps-3">
                        {requiredNotDone.map((x) => (
                          <li key={x.itemId}>{x.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-3">
                <div className="fw-bold mb-2" style={{ color: "#059669" }}>
                  진행률
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
                <div className="small text-muted mt-2">완료한 항목은 “진행 완료”에 체크하세요.</div>
              </div>

              <div className="d-flex justify-content-center gap-2 mt-3">
                <button className="btn btn-outline-emerald rounded-pill fw-bold px-4" onClick={resetAll} disabled={saving}>
                  초기화
                </button>

                <button className="btn btn-emerald rounded-pill fw-bold px-4 text-white" disabled={saving} onClick={handleSaveExit}>
                  저장
                </button>
              </div>

              <div className="small text-muted mt-3 text-center">
                <CheckCircle2 size={16} className="me-1" color="#059669" />
                체크리스트 항목은 DB의 ACTIVE 템플릿 기준으로 자동 노출됩니다.
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .btn-emerald { background-color: #059669; border: none; transition: all 0.3s; }
        .btn-emerald:hover { background-color: #047857; transform: translateY(-2px); }
        .btn-outline-emerald { border: 1px solid #059669; color: #059669; transition: all 0.3s; }
        .btn-outline-emerald:hover { background-color: #059669; color: white; }
      `}</style>
    </div>
  );
}
