import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipboardCheck, ArrowLeft } from "lucide-react";
import { axiosInstance } from "../Tool";

export default function PreChecklistPage() {
  const navigate = useNavigate();
  const location = useLocation();

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
    level: "주의 필요",
    message: "...",
    postGroupCode: "POST_B"
  }
  */


  // ✅ 저장 완료 토스트
  const [savedNotice, setSavedNotice] = useState(false);
  const saveTimerRef = useRef(null);

  // ✅ 전역 saving 대신: 클릭한 행만 잠깐 잠그기(번쩍임 방지)
  const [busyItemId, setBusyItemId] = useState(null);

  // ✅ 로그인 사용자
  const memberId = Number(localStorage.getItem("loginMemberId"));

  // ✅ ChecklistHome 등에서 넘어온 PRE 세션 ID
  const incomingPreSessionId = location?.state?.preSessionId ?? null;

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

        if (!memberId) {
          alert("로그인이 필요합니다.");
          navigate("/login");
          return;
        }

        // 1️⃣ PRE 세션 확보 (이어하기 or 신규)
        let sess;
        if (incomingPreSessionId) {
          sess = { sessionId: incomingPreSessionId };
        } else {
          sess = await startSession(memberId);
        }
        setSession(sess);

        // 2️⃣ 🔥 세션 기준 단일 데이터 조회 (핵심)
        const sessionData = await axiosInstance.get(
          `/checklists/pre/session/${sess.sessionId}`
        ).then(res => res.data);

        // sessionData = { sessionId, templateId, items: [...] }
        setData(sessionData);

        // 3️⃣ 체크 상태 초기화 (CHECKLIST_ITEM_ID 기준)
        const initChecks = {};
        (sessionData.items || []).forEach(it => {
          initChecks[it.itemId] = it.checkStatus ?? "NOT_DONE";
        });
        setChecks(initChecks);

        // 4️⃣ 요약 조회
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
  }, [navigate, memberId, incomingPreSessionId]);


  const progress = useMemo(() => {
    const total = data?.items?.length ?? 0;

    const done = Object.values(checks).filter(
      (v) => v === "DONE"
    ).length;

    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    return { done, total, pct };
  }, [data, checks]);

  // ✅ 영역별 진행 요약
  const areaStats = useMemo(() => {
    const items = data?.items || [];
    const map = new Map();

    const normArea = (a) => (a && String(a).trim() ? a : "기타");

    for (const it of items) {
      const area = normArea(it.checkArea);
      if (!map.has(area)) {
        map.set(area, {
          area,
          total: 0,
          done: 0,
          requiredTotal: 0,
          requiredNotDone: 0,
          requiredNotDoneItems: [],
        });
      }
      const stat = map.get(area);

      stat.total += 1;

      const st = checks?.[it.itemId] || "NOT_DONE";
      if (st === "DONE") stat.done += 1;

      const isReq = it.requiredYn === "Y" || it.required === true;
      if (isReq) {
        stat.requiredTotal += 1;
        if (st !== "DONE") {
          stat.requiredNotDone += 1;
          stat.requiredNotDoneItems.push({ itemId: it.itemId, title: it.title });
        }
      }
    }

    const order = ["등기부 권리 점검", "선순위 관계 점검", "시세·금액 점검", "건물·법적 사항 점검", "기타"];
    const arr = Array.from(map.values());
    arr.sort(
      (a, b) =>
        (order.indexOf(a.area) - order.indexOf(b.area)) ||
        a.area.localeCompare(b.area)
    );

    arr.forEach((x) => {
      x.pct = x.total === 0 ? 0 : Math.round((x.done / x.total) * 100);
    });

    return arr;
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

      // 서버 저장
      await saveCheckStatus(session.sessionId, itemId, nextStatus);

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
            {preResult && (
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

                  <div className="text-secondary mb-3">
                    {preResult.message}
                  </div>

                  <div className="text-center">
                    <button
                      className={`btn rounded-pill fw-bold px-4 ${preResult.postGroupCode === "POST_B"
                        ? "btn-danger"
                        : "btn-emerald text-white"
                        }`}
                      onClick={() => {
                        // ✅ 사전 세션 ID를 반드시 state로 전달
                        navigate("/checklist/post", {
                          state: {
                            preSessionId: session.sessionId, // ⭐ 핵심
                          },
                        });
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
                    if (!window.confirm(
                      "사전 체크리스트를 완료하시겠어요?\n완료하면 결과가 확정됩니다."
                    )) return;

                    try {
                      const post = await completePreSession(session.sessionId);

                      setPreResult({
                        level: post.postGroupCode === "POST_B" ? "주의 필요" : "점검 완료",
                        message:
                          post.postGroupCode === "POST_B"
                            ? "사전 체크리스트에서 일부 미이행 항목이 확인되어, 위험 수준의 사후 체크리스트를 제공합니다."
                            : "사전 체크리스트가 안정적으로 완료되어, 일반 사후 체크리스트를 제공합니다.",
                        postGroupCode: post.postGroupCode
                      });

                    } catch (e) {
                      alert("완료 처리 중 오류가 발생했습니다.");
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
