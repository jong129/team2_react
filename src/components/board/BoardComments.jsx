import React, { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "../Tool";

const BoardComments = ({ boardId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [disabledMsg, setDisabledMsg] = useState(""); // commentYn=N이면 여기로 안내
  const [newContent, setNewContent] = useState("");

  // 대댓글 입력 상태: { [parentId]: "내용" }
  const [replyMap, setReplyMap] = useState({});

  const fetchComments = async () => {
    setLoading(true);
    setDisabledMsg("");
    try {
      const res = await axiosInstance.get(`/api/board/posts/${boardId}/comments`);
      setComments(res.data || []);
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        setDisabledMsg("이 게시판은 댓글 기능이 비활성화되어 있습니다.");
      } else if (status === 401) {
        setDisabledMsg("로그인이 필요합니다.");
      } else {
        setDisabledMsg("댓글을 불러오지 못했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // 1차 댓글 / 대댓글 분리 렌더링(부모-자식 2-depth)
  const grouped = useMemo(() => {
    const parents = [];
    const childrenMap = {};
    for (const c of comments) {
      if (!c.parentId) parents.push(c);
      else {
        if (!childrenMap[c.parentId]) childrenMap[c.parentId] = [];
        childrenMap[c.parentId].push(c);
      }
    }
    return { parents, childrenMap };
  }, [comments]);

  const handleCreate = async () => {
    if (!newContent.trim()) return alert("댓글 내용을 입력하세요.");
    try {
      await axiosInstance.post(`/api/board/posts/${boardId}/comments`, {
        content: newContent.trim(),
        parentId: null,
      });
      setNewContent("");
      fetchComments();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) alert("댓글 기능이 비활성화되어 있습니다.");
      else alert("댓글 등록 실패");
    }
  };

  const handleCreateReply = async (parentId) => {
    const content = (replyMap[parentId] || "").trim();
    if (!content) return alert("대댓글 내용을 입력하세요.");

    try {
      await axiosInstance.post(`/api/board/posts/${boardId}/comments`, {
        content,
        parentId,
      });
      setReplyMap((prev) => ({ ...prev, [parentId]: "" }));
      fetchComments();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) alert("댓글 기능이 비활성화되어 있습니다.");
      else alert("대댓글 등록 실패");
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await axiosInstance.delete(`/api/board/comments/${commentId}`);
      fetchComments();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) alert("삭제 권한이 없습니다.");
      else alert("삭제 실패");
    }
  };

  if (disabledMsg) {
    return (
      <div className="card border-0 shadow-sm rounded-4 mt-3">
        <div className="card-body p-3 p-md-4">
          <div className="text-secondary">{disabledMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm rounded-4 mt-3">
      <div className="card-body p-3 p-md-4">
        <div className="fw-bold mb-2">댓글</div>

        {/* 댓글 작성 */}
        <div className="d-flex gap-2 mb-3">
          <input
            className="form-control"
            placeholder="댓글을 입력하세요"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            등록
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4 text-secondary">로딩중...</div>
        ) : grouped.parents.length === 0 ? (
          <div className="text-secondary">첫 댓글을 작성해보세요.</div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {grouped.parents.map((p) => (
              <div key={p.commentId} className="border rounded-3 p-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-secondary">memberId: {p.memberId}</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{p.content}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.commentId)}>
                    삭제
                  </button>
                </div>

                {/* 대댓글 입력 */}
                <div className="d-flex gap-2 mt-2">
                  <input
                    className="form-control form-control-sm"
                    placeholder="댓글 입력"
                    value={replyMap[p.commentId] || ""}
                    onChange={(e) => setReplyMap((prev) => ({ ...prev, [p.commentId]: e.target.value }))}
                  />
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleCreateReply(p.commentId)}>
                    등록
                  </button>
                </div>

                {/* 대댓글 목록 */}
                {(grouped.childrenMap[p.commentId] || []).length > 0 && (
                  <div className="mt-2 ps-3 d-flex flex-column gap-2">
                    {(grouped.childrenMap[p.commentId] || []).map((c) => (
                      <div key={c.commentId} className="border rounded-3 p-2 bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="small text-secondary">memberId: {c.memberId}</div>
                            <div style={{ whiteSpace: "pre-wrap" }}>{c.content}</div>
                          </div>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.commentId)}>
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardComments;
