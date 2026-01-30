import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { axiosInstance } from "../Tool";

export default function PreChecklistPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [data, setData] = useState(null);
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [checks, setChecks] = useState({});

  // ✅ 사전 체크 완료 후 결과 표시용
  const [preResult, setPreResult] = useState(null);
  /*
  preResult = {
    postGroupCode,
    summary,
    actions,
    analysisItems: []   // ⭐ 전체 미이행 항목 + 중요도
  }
  */

  const [calculating, setCalculating] = useState(false);
  const [calculationDone, setCalculationDone] = useState(false);

  // 자세히 보기
  const [showDetail, setShowDetail] = useState(false);

  // 카드에 보여줄 요약용 3개
  const top3 = preResult?.analysisItems
    ?.slice() // ⭐ 원본 배열 mutate 방지
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 3);

  // ✅ 저장 완료 토스트
  const [savedNotice, setSavedNotice] = useState(false);
  const saveTimerRef = useRef(null);

  // ✅ 전역 saving 대신: 클릭한 행만 잠깐 잠그기(번쩍임 방지)
  const [busyItemId, setBusyItemId] = useState(null);

  // ✅ 로그인 사용자
  const memberId = Number(localStorage.getItem("loginMemberId"));

  const numericSessionId = sessionId ? Number(sessionId) : null;

  const startSession = async (mid) => {
    const res = await axiosInstance.post("/checklists/pre/session/start", null, {
      params: { memberId: mid },
    });
    return res.data;
  };

  const loadSession = async (sessionId) => {
    const res = await axiosInstance.get(
      `/checklists/pre/session/${sessionId}`
    );
    return res.data;
  };

  const loadSummary = async (sessionId) => {
    const res = await axiosInstance.get(`/checklists/pre/session/${sessionId}/summary`);
    return res.data;
  };

  const loadPreResult = async (sessionId) => {
    const res = await axiosInstance.get(
      `/checklists/pre/session/${sessionId}/result`
    );
    return res.data;
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

  const completePreSession = async (sessionId) => {
    const res = await axiosInstance.patch(
      `/checklists/pre/session/${sessionId}/complete`
    );
    return res.data; // ✅ 반드시 반환
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        // =====================================================
        // 0️⃣ 로그인 체크
        // =====================================================
        if (!memberId) {
          alert("로그인이 필요합니다.");
          navigate("/login");
          return;
        }

        // =====================================================
        // 1️⃣ PRE 세션 확보 (URL 기준 단일화)
        // =====================================================
        let sess;

        if (numericSessionId) {
          // ✅ URL에 세션 ID가 있으면 → 무조건 해당 세션 사용
          sess = { sessionId: numericSessionId };
        } else {
          // ✅ URL에 세션 ID가 없을 때만 신규 생성
          const created = await startSession(memberId);

          // 🔥 생성 즉시 URL 고정 (F5 대비 핵심)
          navigate(
            `/checklists/pre/session/${created.sessionId}`,
            { replace: true }
          );

          // ❗ URL이 바뀌면서 useEffect가 다시 실행되므로
          //    여기서 더 진행하면 중복 호출됨 → 즉시 종료
          return;
        }

        setSession(sess);

        // =====================================================
        // 2️⃣ 세션 기준 단일 데이터 조회
        // =====================================================
        const sessionData = await axiosInstance
          .get(`/checklists/pre/session/${sess.sessionId}`)
          .then(res => res.data);

        // sessionData = { sessionId, templateId, items: [...] }
        setData(sessionData);

        // =====================================================
        // 3️⃣ 체크 상태 초기화 (CHECKLIST_ITEM_ID 기준)
        // =====================================================
        const initChecks = {};
        (sessionData.items || []).forEach(it => {
          initChecks[it.itemId] = it.checkStatus ?? "NOT_DONE";
        });
        setChecks(initChecks);

        // =====================================================
        // 4️⃣ 요약 조회
        // =====================================================
        const sum = await loadSummary(sess.sessionId);
        setSummary(sum);

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
  }, [navigate, memberId, numericSessionId]);

  const progress = useMemo(() => {
    const total = data?.items?.length ?? 0;

    const done = Object.values(checks).filter(
      (v) => v === "DONE"
    ).length;

    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    return { done, total, pct };
  }, [data, checks]);


  // ✅ 번쩍임 방지: 클릭한 행만 잠깐 잠금
  const applyStatus = async (itemId, nextStatus) => {
    if (!session?.sessionId) {
      setError("세션이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 이미 저장중인 행이 있으면 중복 클릭 방지(선택)
    if (busyItemId && busyItemId !== itemId) return;

    try {
      setError("");
      setBusyItemId(itemId);

      // UI 선반영
      setChecks((prev) => ({ ...prev, [itemId]: nextStatus }));

      // 요약 갱신(전역 disable 없이 갱신만)
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
      setBusyItemId(null);
    }
  };

  const handleSaveExit = async () => {
    if (!session?.sessionId) return;

    try {
      setBusyItemId("__SAVE__");

      // ⭐ 상태 스냅샷 고정
      const snapshot = { ...checks };

      await axiosInstance.patch(
        `/checklists/pre/session/${session.sessionId}/sync`,
        {
          items: Object.entries(snapshot).map(([itemId, status]) => ({
            itemId: Number(itemId),
            checkStatus: status,
          })),
        }
      );

      setSavedNotice(true);

      saveTimerRef.current = setTimeout(() => {
        navigate("/checklist#checklist");
      }, 1500);
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setBusyItemId(null);
    }
  };



  const resetAll = async () => {
    if (!session?.sessionId) {
      setError("세션이 아직 준비되지 않았습니다.");
      return;
    }

    try {
      setError("");
      setBusyItemId("__RESET__");

      await resetSession(session.sessionId);

      const sessionData = await loadSession(session.sessionId);
      setData(sessionData);

      const initChecks = {};
      (sessionData.items || []).forEach(it => {
        initChecks[it.itemId] = it.checkStatus ?? "NOT_DONE";
      });
      setChecks(initChecks);

      const sum = await loadSummary(session.sessionId);
      setSummary(sum);

    } catch (e) {
      setError("초기화 중 오류");
    } finally {
      setBusyItemId(null);
    }
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
            에러: {String(error)}
          </div>
          <button className="btn btn-outline-secondary mt-3" onClick={() => navigate("/checklist")}>
            뒤로가기
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

  const isBusy = busyItemId !== null;

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
            뒤로가기
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

              <h1 className="mb-3 fw-bold">사전 체크리스트</h1>

              <p className="text-secondary mb-0 mx-auto fw-medium" style={{ maxWidth: 720 }}>
                표에서 항목을 체크한 뒤, 아래에서 요약/경고를 확인하세요.
              </p>

              <div className="mt-2 small text-muted">
                * 사전 체크리스트는 <b>통합 템플릿 1개</b>로 제공돼요. 새로 작성해도 항목은 같고, <b>기록</b>만 새로 저장됩니다.
              </div>
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
                      const name = `status-${item.itemId}`;
                      const rowBusy = busyItemId === item.itemId;

                      return (
                        <tr key={item.itemId} style={rowBusy ? { opacity: 0.6 } : undefined}>
                          <td className="fw-semibold">{area}</td>

                          <td className="text-start px-3">
                            <div className="fw-semibold">{item.title}</div>
                            {item.description && <div className="text-muted small mt-1">{item.description}</div>}
                          </td>

                          {/* ✅ 진행 완료 라디오 (클릭 시 토글) */}
                          <td>
                            <input
                              type="radio"
                              name={name}
                              checked={status === "DONE"}
                              disabled={busyItemId} // 또는 rowBusy/busyItemId 로 바꿨으면 거기에 맞춰 사용
                              onClick={(e) => {
                                e.preventDefault(); // ✅ 라디오 기본 동작 막고 우리가 상태를 바꿈
                                applyStatus(item.itemId, status === "DONE" ? "NOT_DONE" : "DONE");
                              }}
                              onChange={() => { }} // ✅ React 경고 방지용(실제 로직은 onClick)
                            />
                          </td>

                          {/* ✅ 미진행 라디오 (미진행을 눌러도 토글되게) */}
                          <td>
                            <input
                              type="radio"
                              name={name}
                              checked={status === "NOT_DONE"}
                              disabled={busyItemId}
                              onClick={(e) => {
                                e.preventDefault();
                                applyStatus(item.itemId, status === "NOT_DONE" ? "DONE" : "NOT_DONE");
                              }}
                              onChange={() => { }}
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
            {/* ✅ 사전 점검 완료 후 결과 카드 */}
            {calculating && (
              <div className="mb-4 mx-auto text-center" style={{ maxWidth: 920 }}>
                <div className="border rounded-5 p-4 shadow-sm bg-white">
                  <div className="spinner-border text-success mb-3" />
                  <div className="fw-bold">
                    사전 체크리스트 점수를 계산중입니다
                  </div>
                  <div className="text-muted small mt-1">
                    잠시만 기다려 주세요
                  </div>
                </div>
              </div>
            )}

            {showDetail && preResult && (
              <div className="position-fixed top-0 start-0 w-100 h-100"
                style={{ background: "rgba(0,0,0,0.4)", zIndex: 3000 }}>
                <div
                  className="bg-white rounded-4 p-4 shadow-lg"
                  style={{
                    maxWidth: 600,
                    margin: "10vh auto",
                    maxHeight: "70vh",
                    overflowY: "auto"
                  }}
                >
                  <div className="fw-bold mb-3">
                    미이행 항목 상세 분석
                  </div>

                  {preResult.analysisItems.map(item => (
                    <div key={item.itemId} className="mb-3 pb-2 border-bottom">

                      {/* 항목 제목 + 중요도 */}
                      <div className="fw-semibold">
                        {item.title} · 중요도 {(item.importanceScore * 100).toFixed(0)}%
                      </div>

                      {/* AI 근거 */}
                      <div className="text-muted small mt-1">
                        {item.reason}
                      </div>

                    </div>
                  ))}

                  <div className="text-end mt-3">
                    <button
                      className="btn btn-outline-secondary rounded-pill"
                      onClick={() => setShowDetail(false)}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {calculationDone && preResult && (
              <div className="mb-4 mx-auto" style={{ maxWidth: 920 }}>
                <div
                  className={`border rounded-5 p-4 shadow-sm ${preResult.postGroupCode === "POST_B"
                    ? "border-danger bg-light"
                    : "border-success bg-white"
                    }`}
                >
                  <div className="fw-bold mb-2">
                    {preResult.postGroupCode === "POST_B"
                      ? "⚠️ 사전 점검 결과 안내"
                      : "✅ 사전 점검 완료"}
                  </div>

                  {/* ✅ 요약 문장 */}
                  <div className="text-secondary mb-3">
                    {preResult.summary}
                  </div>

                  {/* ✅ 중요 미이행 항목 TOP 3 */}
                  {top3 && top3.length > 0 && (
                    <div className="mb-3">
                      <div className="fw-semibold mb-2">
                        특히 확인이 필요한 항목
                      </div>

                      <ul className="list-unstyled mb-0">
                        {top3.map((item, idx) => (
                          <li key={item.itemId} className="mb-2">
                            <span className="fw-bold me-2">
                              {idx + 1}.
                            </span>
                            <span className="text-muted">
                              {item.reason}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* 🔎 자세히 보기 버튼 */}
                      <div className="text-end mt-2">
                        <button
                          className="btn btn-sm btn-outline-secondary rounded-pill"
                          onClick={() => setShowDetail(true)}
                        >
                          자세히 보기
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      className={`btn rounded-pill fw-bold px-4 ${preResult.postGroupCode === "POST_B"
                          ? "btn-danger"
                          : "btn-emerald text-white"
                        }`}
                      onClick={async () => {
                        try {
                          // ✅ POST 세션 생성
                          const res = await axiosInstance.post(
                            "/checklists/post/session/start",
                            null,
                            {
                              params: {
                                memberId,
                                preSessionId: session.sessionId,
                              },
                            }
                          );

                          const postSessionId = res.data.sessionId;

                          if (!postSessionId) {
                            throw new Error("POST 세션 생성 실패");
                          }

                          // ✅ URL 기반 이동 (location.state 사용 ❌)
                          navigate(`/checklists/post/session/${postSessionId}`);
                        } catch (e) {
                          alert(
                            e?.response?.data?.message ||
                            e?.message ||
                            "사후 체크리스트로 이동 중 오류"
                          );
                        }
                      }}
                    >
                      사후 체크리스트로 이동
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-5 shadow-sm border p-4">
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

              <div className="text-center small text-muted mb-2">
                • <b>저장</b>: 중간까지 점검한 내용을 저장하고, 나중에 이어서 할 수 있어요.<br />
                • <b>완료</b>: 사전 점검을 끝냈다고 확정하며, 이후 사후 체크리스트 유형이 결정돼요.
              </div>
              <div className="d-flex justify-content-center gap-2 mt-3">

                <button
                  className="btn btn-outline-emerald rounded-pill fw-bold px-4"
                  onClick={resetAll}
                  disabled={isBusy}
                >
                  초기화
                </button>

                <button
                  className="btn btn-outline-secondary rounded-pill fw-bold px-4"
                  disabled={isBusy}
                  onClick={handleSaveExit}
                >
                  저장
                </button>

                <button
                  className="btn btn-emerald rounded-pill fw-bold px-4 text-white"
                  disabled={
                    isBusy ||
                    summary?.requiredNotDone > 0
                  }
                  onClick={async () => {
                    if (!window.confirm("사전 체크리스트를 완료하시겠어요?")) return;

                    try {
                      setCalculating(true);       // ⭐ 1️⃣ 계산 시작 UI
                      setCalculationDone(false);

                      // 1️⃣ 최종 sync
                      await axiosInstance.patch(
                        `/checklists/pre/session/${session.sessionId}/sync`,
                        {
                          items: Object.entries(checks).map(([itemId, status]) => ({
                            itemId: Number(itemId),
                            checkStatus: status,
                          }))
                        }
                      );

                      // 2️⃣ 완료 처리
                      await completePreSession(session.sessionId);

                      // 3️⃣ AI 결과 조회 (FastAPI 포함)
                      const result = await loadPreResult(session.sessionId);

                      setPreResult({
                        postGroupCode: result.postGroupCode,
                        summary: result.riskExplanation.summary,
                        actions: result.riskExplanation.actions,
                        analysisItems: result.riskAnalysisItems, // ⭐ 핵심
                      });

                      setCalculationDone(true);   // ⭐ 2️⃣ 계산 완료
                    } catch (e) {
                      alert("결과 계산 중 오류가 발생했습니다.");
                    } finally {
                      setCalculating(false);
                    }
                  }}
                >
                  완료
                </button>
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
