import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Tool";

/**
 * BoardLike
 * - POST /api/board/posts/{boardId}/likes/toggle : 토글
 * - GET  /api/board/posts/{boardId}/likes/count  : (fallback) 카운트만 로드
 *
 * props:
 * - boardId: number
 * - initialLikedYn?: "Y" | "N"  (BoardRead 상세응답에서 내려주는 값)
 * - initialLikeCnt?: number     (BoardRead 상세응답에서 내려주는 값)
 */
const BoardLike = ({ boardId, initialLikedYn, initialLikeCnt }) => {
  const [hidden, setHidden] = useState(false); // like 기능 비활성(403 등)일 때 숨김(안전장치)
  const [loading, setLoading] = useState(false);

  // ✅ 핵심: 상세 응답으로부터 초기 상태를 복원
  const [liked, setLiked] = useState(initialLikedYn === "Y");
  const [likeCount, setLikeCount] = useState(typeof initialLikeCnt === "number" ? initialLikeCnt : 0);

  // ✅ 뒤로 갔다가 다시 들어오면 BoardRead가 row를 새로 받고,
  // 그에 따라 initialLikedYn/initialLikeCnt가 바뀔 수 있으니 동기화
  useEffect(() => {
    if (!boardId) return;

    // initial 값이 들어오면 그걸 최우선으로 UI 복원
    if (typeof initialLikeCnt === "number") setLikeCount(initialLikeCnt);
    if (initialLikedYn === "Y" || initialLikedYn === "N") setLiked(initialLikedYn === "Y");
  }, [boardId, initialLikedYn, initialLikeCnt]);

  // ✅ fallback: initial 값이 없을 때만 count 조회
  useEffect(() => {
    if (!boardId) return;

    // initialLikeCnt가 이미 내려오면 굳이 count API 호출하지 않음
    if (typeof initialLikeCnt === "number") return;

    const fetchCount = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/api/board/posts/${boardId}/likes/count`);
        setLikeCount(res.data?.likeCount ?? 0);
        setHidden(false);
      } catch (err) {
        const status = err.response?.status;
        if (status === 403) setHidden(true); // 기능 OFF
        else console.error("like count error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [boardId, initialLikeCnt]);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await axiosInstance.post(`/api/board/posts/${boardId}/likes/toggle`);
      const data = res.data || {};

      // 너 백엔드 BoardLikeToggleResponse에 맞춰서 유지
      // - liked: boolean
      // - likeCount: number
      setLiked(!!data.liked);
      setLikeCount(typeof data.likeCount === "number" ? data.likeCount : likeCount);
      setHidden(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) setHidden(true);
      else alert("좋아요 처리 실패");
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

      <div className="text-secondary">{loading ? "..." : likeCount}</div>
    </div>
  );
};

export default BoardLike;
