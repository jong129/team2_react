import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Tool";

/**
 * BoardFilesRead
 * - GET  /api/board/posts/{boardId}/files
 * - GET  /api/board/files/{fileId}/download  (blob)
 * - fileYn=N이면 403 -> UI 숨김
 */
const BoardFilesRead = ({ boardId }) => {
  const [hidden, setHidden] = useState(false);
  const [rows, setRows] = useState([]);
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

  const download = async (fileId, originalName) => {
    try {
      const res = await axiosInstance.get(`/api/board/files/${fileId}/download`, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = originalName || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      alert("다운로드 실패");
    }
  };

  if (hidden) return null;

  return (
    <div className="card border-0 shadow-sm rounded-4 mt-3">
      <div className="card-body p-3 p-md-4">
        <div className="fw-bold mb-2">첨부파일</div>

        {loading ? (
          <div className="text-secondary">로딩중...</div>
        ) : rows.length === 0 ? (
          <div className="text-secondary">첨부파일이 없습니다.</div>
        ) : (
          <div className="d-flex flex-column gap-2">
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
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => download(f.fileId, f.originalName)}
                >
                  다운로드
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardFilesRead;
