import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { axiosInstance } from "../Tool";
import BoardFilesEdit from "./BoardFilesEdit";

const BoardEdit = () => {
  const navigate = useNavigate();
  const { boardId } = useParams();
  const location = useLocation();
  const categoryId = location.state?.categoryId ?? null;
  const [row, setRow] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    secretYn: "N",
    postPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ 이미지 업로드용
  const imgRef = useRef(null);
  const [imageFiles, setImageFiles] = useState([]); // File[]
  const [photos, setPhotos] = useState([]); // [{photoId, savedName, thumbName, createdAt...}] 백엔드 DTO에 맞춰 사용

  const fetchRead = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get(`/api/board/posts/${boardId}`);
      const data = res.data;
      setRow(data);
      setForm({
        title: data.title || "",
        content: data.content || "",
        secretYn: data.secretYn || "N",
        postPassword: data.postPassword || "",
      });
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("수정 권한이 없습니다.");
      else setError("조회 실패");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 이미지 목록 불러오기
  const fetchPhotos = async () => {
    try {
      const res = await axiosInstance.get(`/api/board/posts/${boardId}/photos`);
      setPhotos(res.data || []);
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // 사진 기능 미구현/비활성/404여도 수정 화면은 살아야 하므로 조용히 무시
      setPhotos([]);
    }
  };

  useEffect(() => {
    fetchRead();
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onToggleSecret = (e) => {
    const checked = e.target.checked;
    setForm((prev) => ({
      ...prev,
      secretYn: checked ? "Y" : "N",
      postPassword: checked ? prev.postPassword : "",
    }));
  };

  // ✅ 이미지 선택
  const onPickImages = (e) => {
    const picked = Array.from(e.target.files || []);
    setImageFiles(picked);
  };

  const removePickedImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ 이미지 업로드 -> 업로드된 photoId를 content에 토큰으로 추가
  const uploadImages = async () => {
    if (!imageFiles || imageFiles.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      imageFiles.forEach((f) => formData.append("photos", f)); // ✅ 백엔드 @RequestPart("photos") 가정

      const res = await axiosInstance.post(`/api/board/posts/${boardId}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploaded = res.data || []; // [{photoId,...},...]
      if (uploaded.length > 0) {
        const tokens = uploaded.map((p) => `\n[img:${p.photoId}]\n`).join("");
        setForm((prev) => ({ ...prev, content: (prev.content || "") + tokens }));
      }

      setImageFiles([]); // 선택 초기화
      if (imgRef.current) imgRef.current.value = "";
      await fetchPhotos();

      alert("이미지 업로드 완료 (본문에 토큰이 추가됨) — 저장을 눌러야 글에 반영됩니다.");
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) alert("이미지 업로드 권한이 없습니다.");
      else alert("이미지 업로드 실패");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 이미지 삭제(하드삭제) + 본문 토큰도 같이 제거
  const deletePhoto = async (photoId) => {
    if (!window.confirm("이 이미지를 삭제할까요? (DB에서도 삭제됨)")) return;

    setLoading(true);
    try {
      await axiosInstance.delete(`/api/board/photos/${photoId}`);

      // 본문에서 토큰 제거 (정확히 [img:photoId] 형태만 제거)
      const token = `[img:${photoId}]`;
      setForm((prev) => ({
        ...prev,
        content: (prev.content || "").split(token).join(""),
      }));

      await fetchPhotos();
      alert("이미지 삭제 완료 (저장 눌러야 본문 반영)");
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) alert("삭제 권한이 없습니다.");
      else alert("이미지 삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!form.title.trim()) {
      alert("제목을 입력하세요.");
      return;
    }
    if (!form.content.trim()) {
      alert("내용을 입력하세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content,
        secretYn: form.secretYn,
        postPassword: form.secretYn === "Y" ? form.postPassword : null,
      };

      await axiosInstance.put(`/api/board/posts/${boardId}`, payload);
      alert("수정 완료");
      navigate(`/board/read/${boardId}`, { replace: true, state: { categoryId } });
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("수정 권한이 없습니다.");
      else setError("수정 실패");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("삭제할까요?")) return;
    setLoading(true);
    setError("");
    try {
      await axiosInstance.delete(`/api/board/posts/${boardId}`);
      alert("삭제 완료");
      navigate("/board");
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("삭제 권한이 없습니다.");
      else setError("삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold m-0">게시글 수정</h2>
          <button className="btn btn-outline-secondary" onClick={() => navigate("/board")}>
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
          <h2 className="fw-bold m-0">게시글 수정</h2>
          <div className="text-secondary small">boardId: {boardId}</div>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate(`/board/read/${boardId}`)}
            disabled={loading}
          >
            뒤로
          </button>
          <button className="btn btn-outline-danger" onClick={onDelete} disabled={loading}>
            삭제
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          {!row ? (
            <div className="text-center py-5 text-secondary">로딩중...</div>
          ) : (
            <>
              <div className="mb-3">
                <label className="form-label fw-semibold">제목</label>
                <input
                  className="form-control"
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  disabled={loading}
                />
              </div>

              {/* ✅ 이미지 첨부 (본문에 보여줄 이미지) */}
              <div className="mb-2">
                <label className="form-label fw-semibold">내용</label>

                <div className="d-flex gap-2 mb-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => imgRef.current?.click()}
                    disabled={loading}
                  >
                    이미지 첨부
                  </button>

                  <input
                    ref={imgRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={onPickImages}
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={uploadImages}
                    disabled={loading || imageFiles.length === 0}
                  >
                    이미지 업로드
                  </button>

                  {imageFiles.length > 0 && (
                    <div className="text-secondary small align-self-center">선택됨: {imageFiles.length}개</div>
                  )}
                </div>

                {/* 선택 이미지 목록 */}
                {imageFiles.length > 0 && (
                  <div className="mb-2 d-flex flex-column gap-1">
                    {imageFiles.map((f, idx) => (
                      <div key={idx} className="d-flex justify-content-between align-items-center border rounded p-2">
                        <div className="small">
                          {f.name} <span className="text-secondary">({f.size} bytes)</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removePickedImage(idx)}
                          disabled={loading}
                        >
                          제거
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  className="form-control"
                  name="content"
                  value={form.content}
                  onChange={onChange}
                  rows={10}
                  disabled={loading}
                />
              </div>

              {/* ✅ 현재 등록된 이미지 목록 + 삭제 */}
              {photos.length > 0 && (
                <div className="mb-3">
                  <div className="fw-semibold mb-2">등록된 이미지</div>
                  <div className="d-flex flex-wrap gap-2">
                    {photos.map((p) => (
                      <div key={p.photoId} className="border rounded p-2" style={{ width: 180 }}>
                        <div className="mb-2" style={{ width: "100%", height: 100, overflow: "hidden" }}>
                          <img
                            src={`/api/board/photos/${p.photoId}/view`}
                            alt={`photo-${p.photoId}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="small text-secondary">#{p.photoId}</div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deletePhoto(p.photoId)}
                            disabled={loading}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-secondary small mt-2">
                    이미지 삭제 후, 본문 토큰도 제거되지만 최종 반영은 저장 버튼을 눌러야 합니다.
                  </div>
                </div>
              )}

              {/* ✅ 첨부파일 수정 영역(기존) */}
              {row && <BoardFilesEdit boardId={Number(boardId)} />}

              <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="secretYn"
                    checked={form.secretYn === "Y"}
                    onChange={onToggleSecret}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="secretYn">
                    비밀글
                  </label>
                </div>
                <div className="text-secondary small">
                  (비밀글 권한/허용 여부는 백엔드가 카테고리 설정으로 최종 제어)
                </div>
              </div>

              {form.secretYn === "Y" && (
                <div className="mb-3">
                  <label className="form-label fw-semibold">비밀글 비밀번호(선택)</label>
                  <input
                    className="form-control"
                    name="postPassword"
                    value={form.postPassword}
                    onChange={onChange}
                    disabled={loading}
                  />
                </div>
              )}

              <div className="d-flex justify-content-end gap-2">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => navigate(`/board/read/${boardId}`)}
                  disabled={loading}
                >
                  취소
                </button>
                <button className="btn btn-success" onClick={onSubmit} disabled={loading}>
                  저장
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardEdit;
