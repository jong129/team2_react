import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function AdminPostDecisionTestPage() {
  const navigate = useNavigate();

  /* =========================
   * 로그인 체크
   * ========================= */
  useEffect(() => {
    const memberId = Number(localStorage.getItem("loginMemberId")) || 0;
    if (!memberId) {
      alert("로그인이 필요합니다.");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchPreSessions = async () => {
      try {
        setListLoading(true);
        const res = await axiosInstance.get("/admin/pre-sessions");
        setPreSessions(res.data || []);
      } catch (e) {
        console.error("PRE 세션 목록 조회 실패", e);
      } finally {
        setListLoading(false);
      }
    };

    fetchPreSessions();
  }, []);


  /* =========================
   * 상태
   * ========================= */
  const [preSessionId, setPreSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

  // ✅ PRE 세션 목록
  const [preSessions, setPreSessions] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  // 페이징
  const PAGE_SIZE = 7;
  const [currentPage, setCurrentPage] = useState(1);


  /*
    result = {
      postGroupCode,
      riskScoreSum,
      scores: [{ itemId, title, importanceScore }]
    }
  */

  /* =========================
   * 분기 테스트 실행
   * ========================= */
  const runTest = async () => {
    if (!preSessionId) {
      alert("PRE_SESSION_ID를 입력하세요.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await axiosInstance.get(
        `/admin/ai/post-decision/${preSessionId}`
      );

      setResult(res.data);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
        e?.message ||
        "분기 테스트 중 오류 발생"
      );
    } finally {
      setLoading(false);
    }
  };

  const deletePreSession = async (sessionId) => {
    if (!window.confirm(`PRE_SESSION_ID ${sessionId} 기록을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await axiosInstance.delete(`/admin/pre-sessions/${sessionId}`);

      // ✅ 삭제 후 목록에서 제거
      setPreSessions((prev) =>
        prev.filter((s) => s.sessionId !== sessionId)
      );

      // 선택 중이던 세션이면 초기화
      if (String(sessionId) === preSessionId) {
        setPreSessionId("");
        setResult(null);
      }
    } catch (e) {
      alert(
        e?.response?.data?.message ||
        e?.message ||
        "PRE 세션 삭제 실패"
      );
    }
  };


  // =========================
  // 페이징 계산
  // =========================
  const totalPages = Math.ceil(preSessions.length / PAGE_SIZE);

  const pagedPreSessions = preSessions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const formatKst = (dateStr) => {
    if (!dateStr) return "-";

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(dateStr));
  };

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      {/* 헤더 */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h3 className="fw-bold mb-1">POST 분기 AI 검증</h3>
          <div className="text-secondary small">
            사전 체크리스트 결과를 기준으로 AI 분기 판단 과정을 확인합니다
          </div>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          뒤로
        </button>
      </div>
      {/* PRE 세션 목록 */}
      <div className="border rounded-4 p-4 shadow-sm mb-4">
        <div className="fw-bold mb-3">최근 완료된 PRE 세션</div>

        {listLoading && (
          <div className="small text-secondary">불러오는 중...</div>
        )}

        {!listLoading && preSessions.length === 0 && (
          <div className="small text-muted">완료된 PRE 세션이 없습니다.</div>
        )}

        {preSessions.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm table-bordered align-middle text-center mb-0">
              <thead style={{ background: "#f8fafc" }}>
                <tr>
                  <th style={{ width: "20%" }}>PRE_SESSION_ID</th>
                  <th style={{ width: "20%" }}>MEMBER_ID</th>
                  <th>완료일시</th>
                  <th style={{ width: "15%" }}>선택</th>
                  <th style={{ width: "15%" }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {pagedPreSessions.map((s) => (
                  <tr key={s.sessionId}>
                    <td className="fw-semibold">{s.sessionId}</td>
                    <td>{s.memberId}</td>
                    <td>{formatKst(s.completedAt)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => {
                          setPreSessionId(String(s.sessionId));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        선택
                      </button>
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deletePreSession(s.sessionId)}
                      >
                        삭제
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="d-flex justify-content-center gap-2 mt-3">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  이전
                </button>

                <span className="small align-self-center">
                  {currentPage} / {totalPages}
                </span>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 입력 카드 */}
      <div className="border rounded-4 p-4 shadow-sm mb-4">
        <div className="fw-bold mb-2">PRE_SESSION_ID 입력</div>

        <div className="d-flex gap-2">
          <input
            type="number"
            className="form-control"
            placeholder="예: 67"
            value={preSessionId}
            onChange={(e) => setPreSessionId(e.target.value)}
          />
          <button
            className="btn btn-success"
            onClick={runTest}
            disabled={loading}
          >
            {loading ? "분석 중..." : "분기 테스트 실행"}
          </button>
        </div>

        <div className="small text-muted mt-2">
          * 완료된 PRE 체크리스트 세션 ID를 입력하세요
        </div>
      </div>

      {/* 오류 */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <AlertTriangle size={18} className="me-2" />
          {error}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <>
          {/* 요약 카드 */}
          <div className="border rounded-4 p-4 shadow-sm mb-4">
            <div className="fw-bold mb-2">AI 분기 결과</div>

            <div className="d-flex gap-4">
              <div>
                <div className="text-muted small">POST_GROUP_CODE</div>
                <div
                  className={`fw-bold ${result.postGroupCode === "POST_B"
                    ? "text-danger"
                    : "text-success"
                    }`}
                >
                  {result.postGroupCode}
                </div>
              </div>

              <div>
                <div className="text-muted small">riskScoreSum</div>
                <div className="fw-bold">
                  {result.riskScoreSum} 점
                </div>
              </div>

              <div>
                <div className="text-muted small">항목 수</div>
                <div className="fw-bold">
                  {result.scores?.length ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* 점수 테이블 */}
          <div className="border rounded-4 shadow-sm overflow-hidden">
            <table className="table table-bordered mb-0 align-middle text-center">
              <thead style={{ background: "#f1f5f9" }}>
                <tr>
                  <th style={{ width: "10%" }}>itemId</th>
                  <th>항목명</th>
                  <th style={{ width: "20%" }}>importanceScore</th>
                  <th style={{ width: "15%" }}>위험</th>
                </tr>
              </thead>
              <tbody>
                {(result.scores || []).map((s) => (
                  <tr key={s.itemId}>
                    <td>{s.itemId}</td>
                    <td className="text-start px-3">{s.title}</td>
                    <td>{s.importanceScore}</td>
                    <td>
                      {s.importanceScore >= 80 ? (
                        <span className="badge bg-danger">HIGH</span>
                      ) : (
                        <span className="badge bg-secondary">NORMAL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
