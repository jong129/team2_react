import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Tool";

/**
 * - POST /api/board/posts/{boardId}/reports
 * - 403 (reportYn=N) => UI 숨김
 * - 401 => 로그인 필요
 * - 409 => 이미 신고
 */
const BoardReport = ({ boardId }) => {
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [boardId]);

  const handleReport = async () => {
    if (!boardId || loading) return;

    if (!window.confirm("이 게시글을 신고하시겠습니까?")) return;

    setLoading(true);
    try {
      await axiosInstance.post(`/api/board/posts/${boardId}/reports`, {
        reasonCode: "SPAM",
        reasonText: null,
      });
      alert("신고가 접수되었습니다.");
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) setHidden(true); // reportYn=N
      else if (status === 409) alert("이미 신고한 게시글입니다.");
      else alert("신고 실패");
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  return (
    <div className="d-flex align-items-center gap-2 mt-3">
      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={handleReport}
        disabled={loading}
      >
        신고
      </button>
    </div>
  );
};

export default BoardReport;
