import React, { useEffect, useState } from "react";
import { axiosInstance } from "../Tool";

const BoardFiles = ({ boardId }) => {
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/board/posts/${boardId}/files`);
      setRows(res.data || []);
      setHidden(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) setHidden(true); // fileYn=N
      else console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!boardId) return;
    setHidden(false);
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    setSelected(files);
  };

  const upload = async () => {
    if (selected.length === 0) return alert("파일을 선택하세요.");

    const form = new FormData();
    selected.forEach((f) => form.append("files", f));

    setLoading(true);
    try {
      await axiosInstance.post(`/api/board/posts/${boardId}/files`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSelected([]);
      await fetchList();
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
      await fetchList();
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
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="fw-bold">첨부파일</div>

          <div className="d-flex gap-2">
            <input type="file" multiple onChange={onPick} disabled={loading} />
            <button className="btn btn-outline-primary" onClick={upload} disabled={loading}>
              업로드
            </button>
          </div>
        </div>

        <div className="mt-3">
          {rows.length === 0 ? (
            <div className="text-secondary">첨부파일이 없습니다.</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {rows.map((f) => (
                <div key={f.fileId} className="d-flex justify-content-between align-items-center border rounded-3 p-2">
                  <div>
                    <div className="fw-semibold">{f.originalName}</div>
                    <div className="text-secondary small">{f.fileSize ?? 0} bytes</div>
                  </div>

                  <div className="d-flex gap-2">
                    <a
                      className="btn btn-sm btn-outline-secondary"
                      href={`/api/board/files/${f.fileId}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      다운로드
                    </a>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(f.fileId)} disabled={loading}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardFiles;
