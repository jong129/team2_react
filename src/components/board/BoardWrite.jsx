import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { axiosInstance } from "../Tool";

const BoardWrite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const categoryIdParam = searchParams.get("categoryId");
  const categoryId = categoryIdParam ? Number(categoryIdParam) : null;

  const [categories, setCategories] = useState([]);
  const activeCategory = useMemo(
    () => categories.find((c) => Number(c.categoryId) === Number(categoryId)) || null,
    [categories, categoryId]
  );

  const [form, setForm] = useState({
    title: "",
    content: "",
    secretYn: "N",
    postPassword: "",
  });

  // ✅ 첨부파일 상태
  const [files, setFiles] = useState([]); // File[]

  // ✅ 이미지 상태 (본문에 노출될 이미지)
  const imgRef = useRef(null);
  const [imageFiles, setImageFiles] = useState([]); // File[]

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = async () => {
    setError("");
    try {
      const res = await axiosInstance.get("/api/board/categories/list");
      setCategories(res.data || []);
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      setError("카테고리 조회 실패");
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카테고리에서 secret 기능이 꺼져있으면 강제로 N
  useEffect(() => {
    if (!activeCategory) return;
    if (activeCategory.secretYn !== "Y") {
      setForm((prev) => ({ ...prev, secretYn: "N", postPassword: "" }));
    }
  }, [activeCategory]);

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

  // ✅ 파일 선택
  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
  };

  // ✅ 선택 파일 제거(선택)
  const removePickedFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ 이미지 선택
  const onPickImages = (e) => {
    const picked = Array.from(e.target.files || []);
    setImageFiles(picked);
  };

  // ✅ 선택 이미지 제거(선택)
  const removePickedImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (boardId) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f)); // ✅ 백엔드 @RequestPart("files") 와 일치

    await axiosInstance.post(`/api/board/posts/${boardId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  // ✅ 이미지 업로드 -> photoId 목록 리턴
  const uploadImages = async (boardId) => {
    if (!imageFiles || imageFiles.length === 0) return [];

    const formData = new FormData();
    imageFiles.forEach((f) => formData.append("photos", f)); // ✅ 백엔드 @RequestPart("photos") 가정

    const res = await axiosInstance.post(`/api/board/posts/${boardId}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data || []; // [{photoId,...},...]
  };

  const onSubmit = async () => {
    if (!categoryId) {
      alert("categoryId가 없습니다. 목록에서 글쓰기 버튼으로 들어오세요.");
      return;
    }
    if (!form.title.trim()) {
      alert("제목을 입력하세요.");
      return;
    }
    if (!form.content.trim()) {
      alert("내용을 입력하세요.");
      return;
    }

    // ✅ fileYn=N이면 첨부 기능 자체를 막을 거면 여기서도 체크(프론트 안전장치)
    if (activeCategory?.fileYn !== "Y" && files.length > 0) {
      alert("이 카테고리는 첨부파일 기능이 꺼져있습니다.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        categoryId,
        title: form.title.trim(),
        content: form.content,
        secretYn: form.secretYn,
        postPassword: form.secretYn === "Y" ? form.postPassword : null,
      };

      // 1) 글 먼저 저장 -> boardId 확보
      const res = await axiosInstance.post("/api/board/posts", payload);
      const saved = res.data;

      // 2) 첨부파일 업로드(선택)
      try {
        if (activeCategory?.fileYn === "Y") {
          await uploadFiles(saved.boardId);
        }
      } catch (fileErr) {
        console.error(fileErr);
        alert("글은 등록됐지만 첨부파일 업로드에 실패했습니다. (수정에서 다시 올리세요)");
      }

      // 3) 이미지 업로드(선택) -> 본문에 토큰 붙여서 content 업데이트
      try {
        const uploadedPhotos = await uploadImages(saved.boardId);

        if (uploadedPhotos.length > 0) {
          const tokens = uploadedPhotos
            .map((p) => `\n[img:${p.photoId}]\n`)
            .join("");

          const newContent = (payload.content || "") + tokens;

          await axiosInstance.put(`/api/board/posts/${saved.boardId}`, {
            title: payload.title,
            content: newContent,
            secretYn: payload.secretYn,
            postPassword: payload.postPassword,
          });
        }
      } catch (imgErr) {
        console.error(imgErr);
        alert("글은 등록됐지만 이미지 업로드에 실패했습니다. (수정에서 다시 올리세요)");
      }

      alert("등록 완료");
      navigate(`/board/read/${saved.boardId}`, { replace: true, state: { categoryId } });
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("권한이 없습니다.");
      else setError("등록 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h2 className="fw-bold m-0">글쓰기</h2>
          <div className="text-secondary small">
            {activeCategory ? `카테고리: ${activeCategory.categoryName}` : "카테고리를 확인하세요."}
          </div>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/board")} disabled={loading}>
          뒤로
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-3 p-md-4">
          <div className="mb-3">
            <label className="form-label fw-semibold">제목</label>
            <input
              className="form-control"
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder="제목을 입력하세요"
              disabled={loading}
            />
          </div>

          <div className="mb-2">
            <label className="form-label fw-semibold">내용</label>

            {/* ✅ 이미지 첨부 버튼 */}
            <div className="d-flex gap-2 mb-2">
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

              {imageFiles.length > 0 && (
                <div className="text-secondary small align-self-center">선택됨: {imageFiles.length}개</div>
              )}
            </div>

            <textarea
              className="form-control"
              name="content"
              value={form.content}
              onChange={onChange}
              placeholder="내용을 입력하세요"
              rows={10}
              disabled={loading}
            />
          </div>

          {/* ✅ 선택 이미지 목록(선택) */}
          {imageFiles.length > 0 && (
            <div className="mt-2 d-flex flex-column gap-1 mb-3">
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

          <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="secretYn"
                checked={form.secretYn === "Y"}
                onChange={onToggleSecret}
                disabled={loading || activeCategory?.secretYn !== "Y"}
              />
              <label className="form-check-label" htmlFor="secretYn">
                비밀글
              </label>
            </div>

            {activeCategory?.secretYn !== "Y" && (
              <div className="text-secondary small">이 카테고리는 비밀글 기능이 꺼져있습니다.</div>
            )}
          </div>

          {activeCategory?.secretYn === "Y" && form.secretYn === "Y" && (
            <div className="mb-3">
              <label className="form-label fw-semibold">비밀글 비밀번호(선택)</label>
              <input
                className="form-control"
                name="postPassword"
                value={form.postPassword}
                onChange={onChange}
                placeholder="비밀번호 입력"
                disabled={loading}
              />
            </div>
          )}

          {/* ✅ 첨부파일 */}
          <div className="mb-3">
            <label className="form-label fw-semibold">첨부파일</label>

            {activeCategory?.fileYn !== "Y" ? (
              <div className="text-secondary small">이 카테고리는 첨부파일 기능이 꺼져있습니다.</div>
            ) : (
              <>
                <input type="file" multiple onChange={onPickFiles} disabled={loading} />

                {files.length > 0 && (
                  <div className="mt-2 d-flex flex-column gap-1">
                    {files.map((f, idx) => (
                      <div key={idx} className="d-flex justify-content-between align-items-center border rounded p-2">
                        <div className="small">
                          {f.name} <span className="text-secondary">({f.size} bytes)</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removePickedFile(idx)}
                          disabled={loading}
                        >
                          제거
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary" onClick={() => navigate("/board")} disabled={loading}>
              취소
            </button>
            <button className="btn btn-success" onClick={onSubmit} disabled={loading}>
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardWrite;
