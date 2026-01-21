import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { axiosInstance } from "../Tool";
import BoardComments from "./BoardComments";
import BoardLike from "./BoardLike";
import BoardReport from "./BoardReport";
import BoardFilesRead from "./BoardFilesRead";

const BoardRead = () => {
  const navigate = useNavigate();
  const { boardId } = useParams();
  const location = useLocation();

  const categoryIdFromState = location.state?.categoryId ?? null;

  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 카테고리 정책(공개 리스트에서 가져와서 매칭)
  const [categoryPolicy, setCategoryPolicy] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(false);

  // ✅ AI 결과 상태
  const [aiSummary, setAiSummary] = useState(null); // {resultText, cached, modelName, ...}
  const [aiSentiment, setAiSentiment] = useState(null);
  const [aiLoading, setAiLoading] = useState({ summary: false, sentiment: false });
  const [aiError, setAiError] = useState("");

  const fetchRead = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get(`/api/board/posts/${boardId}`);
      setRow(res.data);
    } catch (err) {
      const status = err.response?.status;

      if (status === 404) {
        alert("삭제되었거나 존재하지 않는 글입니다.");
        if (categoryIdFromState) navigate(`/board?categoryId=${categoryIdFromState}`, { replace: true });
        else navigate("/board", { replace: true });
        return;
      }

      if (status === 401) setError("비밀글입니다. 로그인 후 확인하세요.");
      else if (status === 403) setError("비밀글입니다. 작성자 또는 관리자만 열람할 수 있습니다.");
      else setError("조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      await axiosInstance.delete(`/api/board/posts/${boardId}`);
      if (categoryIdFromState) navigate(`/board?categoryId=${categoryIdFromState}`, { replace: true });
      else navigate("/board", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) alert("삭제 권한이 없습니다.");
      else alert("삭제 실패");
    }
  };

  useEffect(() => {
    fetchRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // ✅ 실제 categoryId 결정(직접 URL 진입 대비)
  const effectiveCategoryId = useMemo(() => {
    return row?.categoryId ?? categoryIdFromState ?? null;
  }, [row, categoryIdFromState]);

  // ✅ 카테고리 정책 조회(공개 목록에서 가져와서 매칭)
  const fetchCategoryPolicy = async (cid) => {
    if (!cid) {
      setCategoryPolicy(null);
      return;
    }
    setPolicyLoading(true);
    try {
      const res = await axiosInstance.get("/api/board/categories/list");
      const list = res.data || [];
      const found = list.find((c) => Number(c.categoryId) === Number(cid));
      setCategoryPolicy(found || null);
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // 정책 조회 실패해도 글 읽기는 가능하게 둠
      setCategoryPolicy(null);
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryPolicy(effectiveCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCategoryId]);

  const ynDefaultY = (v) => (String(v).toUpperCase() === "N" ? "N" : "Y");

  // ✅ 글 단위 기능(댓글/좋아요/신고/파일)은 row에 붙어있는 값으로 제어
  const feature = useMemo(() => {
    return {
      commentYn: ynDefaultY(row?.commentYn),
      likeYn: ynDefaultY(row?.likeYn),
      reportYn: ynDefaultY(row?.reportYn),
      fileYn: ynDefaultY(row?.fileYn),
    };
  }, [row]);

  // ✅ 카테고리 단위 AI 기능(기본값 N)
  const aiFeature = useMemo(() => {
    const ynDefaultN = (v) => (String(v).toUpperCase() === "Y" ? "Y" : "N");
    return {
      aiSummaryYn: ynDefaultN(categoryPolicy?.aiSummaryYn),
      aiSentimentYn: ynDefaultN(categoryPolicy?.aiSentimentYn),
    };
  }, [categoryPolicy]);

  // ✅ [img:숫자] 토큰을 이미지로 치환해서 렌더링
  const renderedContent = useMemo(() => {
    const content = row?.content ?? "";
    if (!content) return <span style={{ whiteSpace: "pre-wrap" }} />;

    const tokenRegex = /\[img:(\d+)\]/g;

    const parts = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = tokenRegex.exec(content)) !== null) {
      const start = match.index;
      const end = tokenRegex.lastIndex;
      const photoId = match[1];

      if (start > lastIndex) {
        parts.push(
          <span key={`t-${key++}`} style={{ whiteSpace: "pre-wrap" }}>
            {content.slice(lastIndex, start)}
          </span>
        );
      }

      parts.push(
        <div key={`i-${key++}`} className="my-3">
          <img
            src={`/api/board/photos/${photoId}/view`}
            alt={`photo-${photoId}`}
            className="img-fluid rounded"
            style={{ maxHeight: 700 }}
          />
        </div>
      );

      lastIndex = end;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`t-${key++}`} style={{ whiteSpace: "pre-wrap" }}>
          {content.slice(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  }, [row]);

  // =========================
  // ✅ AI 호출
  // =========================
  const callAi = async (type, force = false) => {
    setAiError("");
    setAiLoading((prev) => ({ ...prev, [type]: true }));

    const url =
      type === "summary"
        ? `/api/board/ai/summary/${boardId}`
        : `/api/board/ai/sentiment/${boardId}`;

    try {
      const res = await axiosInstance.post(url, { force }, { withCredentials: true });
      if (type === "summary") setAiSummary(res.data);
      else setAiSentiment(res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.response?.data?.message;

      if (status === 401) setAiError("로그인이 필요합니다.");
      else if (status === 403) setAiError(msg || "해당 카테고리에서 AI 기능이 꺼져있습니다.");
      else setAiError("AI 호출 실패");
    } finally {
      setAiLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const backToList = () => {
    if (effectiveCategoryId) navigate(`/board?categoryId=${effectiveCategoryId}`);
    else navigate("/board");
  };

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold m-0">게시글 상세</h2>
          <button className="btn btn-outline-secondary" onClick={backToList}>
            뒤로
          </button>
        </div>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h2 className="fw-bold m-0">게시글 상세</h2>
          {policyLoading && <div className="text-secondary small mt-1">카테고리 정책 로딩중...</div>}
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={backToList} disabled={loading}>
            뒤로
          </button>

          <button
            className="btn btn-outline-success"
            onClick={() => navigate(`/board/edit/${boardId}`, { state: { categoryId: effectiveCategoryId } })}
            disabled={loading}
          >
            수정
          </button>

          <button className="btn btn-outline-danger" onClick={handleDelete} disabled={loading}>
            삭제
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          {loading || !row ? (
            <div className="text-center py-5 text-secondary">로딩중...</div>
          ) : (
            <>
              <div className="mb-2">
                <div className="fw-bold fs-4">{row.title}</div>
                <div className="text-secondary small mt-1">
                  작성자: {row.writerName || row.loginId || "-"} / 작성일: {row.createdAt || "-"} / 조회:{" "}
                  {row.viewCnt ?? 0}
                </div>
              </div>

              <hr />

              <div>{renderedContent}</div>
            </>
          )}
        </div>
      </div>

      {/* =========================
          ✅ AI 섹션 (카테고리 토글이 Y일 때만)
         ========================= */}
      {!loading && row && (aiFeature.aiSummaryYn === "Y" || aiFeature.aiSentimentYn === "Y") && (
        <div className="card border-0 shadow-sm rounded-4 mt-3">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <div className="fw-bold">AI 분석</div>
                <div className="text-secondary small">
                  카테고리 설정에 따라 버튼이 노출됩니다. (요약/호재악재)
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap">
                {aiFeature.aiSummaryYn === "Y" && (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => callAi("summary", false)}
                      disabled={aiLoading.summary}
                    >
                      {aiLoading.summary ? "요약 중..." : "AI 요약"}
                    </button>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => callAi("summary", true)}
                      disabled={aiLoading.summary}
                    >
                      재생성
                    </button>
                  </>
                )}

                {aiFeature.aiSentimentYn === "Y" && (
                  <>
                    <button
                      className="btn btn-warning"
                      onClick={() => callAi("sentiment", false)}
                      disabled={aiLoading.sentiment}
                    >
                      {aiLoading.sentiment ? "분석 중..." : "호재/악재 분석"}
                    </button>
                    <button
                      className="btn btn-outline-warning"
                      onClick={() => callAi("sentiment", true)}
                      disabled={aiLoading.sentiment}
                    >
                      재생성
                    </button>
                  </>
                )}
              </div>
            </div>

            {aiError && <div className="alert alert-danger mt-3 mb-0">{aiError}</div>}

            {(aiSummary || aiSentiment) && <hr />}

            {aiSummary && (
              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="fw-semibold">요약 결과</div>
                  <div className="text-secondary small">
                    {aiSummary.cached ? "cached" : "new"} / model: {aiSummary.modelName || "unknown"}
                  </div>
                </div>
                <div className="mt-2 p-3 rounded-3" style={{ background: "#f8f9fa", whiteSpace: "pre-wrap" }}>
                  {aiSummary.resultText}
                </div>
              </div>
            )}

            {aiSentiment && (
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="fw-semibold">호재/악재 분석</div>
                  <div className="text-secondary small">
                    {aiSentiment.cached ? "cached" : "new"} / model: {aiSentiment.modelName || "unknown"}
                  </div>
                </div>
                <div className="mt-2 p-3 rounded-3" style={{ background: "#fff7e6", whiteSpace: "pre-wrap" }}>
                  {aiSentiment.resultText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ 첨부파일: fileYn이 Y일 때만 */}
      {!loading && row && feature.fileYn === "Y" && <BoardFilesRead boardId={Number(boardId)} />}

      {/* ✅ 공감/신고 */}
      {!loading && row && (feature.likeYn === "Y" || feature.reportYn === "Y") && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            {feature.likeYn === "Y" && (
              <BoardLike boardId={Number(boardId)} initialLikedYn={row.likedYn} initialLikeCnt={row.likeCnt} />
            )}
          </div>
          <div>{feature.reportYn === "Y" && <BoardReport boardId={Number(boardId)} />}</div>
        </div>
      )}

      {/* ✅ 댓글 */}
      {!loading && row && feature.commentYn === "Y" && <BoardComments boardId={Number(boardId)} />}
    </div>
  );
};

export default BoardRead;
