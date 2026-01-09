import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Tool";

/**
 * BoardLike
 * - GET  /api/board/posts/{boardId}/likes/count  : 초기 카운트 로드 (likeYn=N이면 403 -> 숨김)
 * - POST /api/board/posts/{boardId}/likes/toggle : 토글 (401/403 처리)
 *
 * props:
 * - boardId: number
 */
const BoardLike = ({ boardId }) => {
  const [hidden, setHidden] = useState(false); // likeYn=N이면 숨김
  const [loading, setLoading] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false); // 서버에 "내가 눌렀는지" 조회 API가 없으니 토글 결과로만 반영

  const fetchCount = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/board/posts/${boardId}/likes/count`);
      setLikeCount(res.data?.likeCount ?? 0);
      setHidden(false);
    } catch (err) {
      const status = err.response?.status;
      // likeYn=N이면 백엔드에서 403 내려오도록 구현했으니 UI 숨김 처리
      if (status === 403) {
        setHidden(true);
      } else {
        // 기타 오류는 숨기지 않고 카운트만 유지
        console.error("like count error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!boardId) return;
    fetchCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await axiosInstance.post(`/api/board/posts/${boardId}/likes/toggle`);
      const data = res.data || {};
      setLiked(!!data.liked);
      setLikeCount(typeof data.likeCount === "number" ? data.likeCount : likeCount);
      setHidden(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) {
        // likeYn=N이거나 권한 제한이 있으면 숨김(또는 안내)
        setHidden(true);
      } else {
        alert("좋아요 처리 실패");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  return (
    <div className="d-flex align-items-center gap-2 mt-3">
      <button
        type="button"
        className={`btn ${liked ? "btn-success" : "btn-outline-success"}`}
        onClick={handleToggle}
        disabled={loading}
      >
        {liked ? "공감됨" : "공감"}
      </button>

      <div className="text-secondary">
        {loading ? "..." : likeCount}
      </div>
    </div>
  );
};

export default BoardLike;
