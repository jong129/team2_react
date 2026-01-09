import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Tool";

/**
 * BoardFilesEdit
 * - GET    /api/board/posts/{boardId}/files
 * - POST   /api/board/posts/{boardId}/files   (multipart)
 * - DELETE /api/board/files/{fileId}
 * - fileYn=N이면 403 -> UI 숨김
 */
const BoardFilesEdit = ({ boardId }) => {
  const [hidden, setHidden] = useState(false);
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/board/posts/${boardId}/files`);
      setRows(res.data || []);
      setHidden(false);
    } catch (err) {
      if (err.response?.status === 403) setHidden(true);
      else console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!boardId) return;
    setHidden(false);
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    setPicked(files);
  };

  const upload = async () => {
    if (picked.length === 0) return alert("추가할 파일을 선택하세요.");

    const formData = new FormData();
    picked.forEach((f) => formData.append("files", f));

    setLoading(true);
    try {
      await axiosInstance.post(`/api/board/posts/${boardId}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPicked([]);
      await fetchFiles();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) setHidden(true);
      else alert("업로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (fileId) => {
    if (!window.confirm("첨부파일을 삭제하시겠습니까?")) return;

    setLoading(true);
    try {
      await axiosInstance.delete(`/api/board/files/${fileId}`);
      await fetchFiles();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) alert("삭제 권한이 없습니다.");
      else alert("삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  if (hidden) return null;

  return (
    <div className="card border-0 shadow-sm rounded-4 mt-3">
      <div className="card-body p-3 p-md-4">
        <div className="fw-bold mb-2">첨부파일</div>

        {/* 기존 파일 목록 + 삭제 */}
        {rows.length === 0 ? (
          <div className="text-secondary mb-2">첨부파일이 없습니다.</div>
        ) : (
          <div className="d-flex flex-column gap-2 mb-3">
            {rows.map((f) => (
              <div
                key={f.fileId}
                className="d-flex justify-content-between align-items-center border rounded-3 p-2"
              >
                <div className="small">
                  <div className="fw-semibold">{f.originalName}</div>
                  <div className="text-secondary">{f.fileSize ?? 0} bytes</div>
                </div>

                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => remove(f.fileId)}
                  disabled={loading}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 새 파일 추가 업로드 */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <input type="file" multiple onChange={onPick} disabled={loading} />
          <button className="btn btn-outline-primary" onClick={upload} disabled={loading}>
            추가 업로드
          </button>
        </div>

        {picked.length > 0 && (
          <div className="text-secondary small mt-2">
            선택됨: {picked.map((f) => f.name).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardFilesEdit;
