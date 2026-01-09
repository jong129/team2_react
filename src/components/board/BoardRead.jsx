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

  const categoryId = location.state?.categoryId ?? null;

  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        if (categoryId) navigate(`/board?categoryId=${categoryId}`, { replace: true });
        else navigate("/board", { replace: true });
        return;
      }

      if (status === 401) setError("로그인이 필요합니다.");
      else if (status === 403) setError("접근 권한이 없습니다(비밀글일 수 있음).");
      else setError("조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      await axiosInstance.delete(`/api/board/posts/${boardId}`);

      if (categoryId) navigate(`/board?categoryId=${categoryId}`, { replace: true });
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

      // 토큰 이전 텍스트
      if (start > lastIndex) {
        parts.push(
          <span key={`t-${key++}`} style={{ whiteSpace: "pre-wrap" }}>
            {content.slice(lastIndex, start)}
          </span>
        );
      }

      // 토큰 -> 이미지
      parts.push(
        <div key={`i-${key++}`} className="my-3">
          <img
            // ✅ 백엔드 이미지 VIEW 엔드포인트에 맞춰라
            // 예: @GetMapping("/api/board/photos/{photoId}/view")
            src={`/api/board/photos/${photoId}/view`}
            alt={`photo-${photoId}`}
            className="img-fluid rounded"
            style={{ maxHeight: 700 }}
          />
        </div>
      );

      lastIndex = end;
    }

    // 마지막 남은 텍스트
    if (lastIndex < content.length) {
      parts.push(
        <span key={`t-${key++}`} style={{ whiteSpace: "pre-wrap" }}>
          {content.slice(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  }, [row]);

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold m-0">게시글 상세</h2>
          <button
            className="btn btn-outline-secondary"
            onClick={() => (categoryId ? navigate(`/board?categoryId=${categoryId}`) : navigate("/board"))}
          >
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
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => (categoryId ? navigate(`/board?categoryId=${categoryId}`) : navigate("/board"))}
            disabled={loading}
          >
            뒤로
          </button>

          <button
            className="btn btn-outline-success"
            onClick={() => navigate(`/board/edit/${boardId}`, { state: { categoryId } })}
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

              {/* ✅ 본문(텍스트 + 이미지 토큰 치환) */}
              <div>{renderedContent}</div>
            </>
          )}
        </div>
      </div>

      {!loading && row && <BoardFilesRead boardId={Number(boardId)} />}

      {!loading && row && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <BoardLike boardId={Number(boardId)} />
          <BoardReport boardId={Number(boardId)} />
        </div>
      )}

      {!loading && row && <BoardComments boardId={Number(boardId)} />}
    </div>
  );
};

export default BoardRead;
