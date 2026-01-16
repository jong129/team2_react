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

  const [files, setFiles] = useState([]);
  const imgRef = useRef(null);
  const [imageFiles, setImageFiles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // AI draft UI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDraft, setAiDraft] = useState(""); // 미리보기용 (원하면 바로 content에 적용만 해도 됨)

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
  }, []);

  // secret 정책
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

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
  };

  const removePickedFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onPickImages = (e) => {
    const picked = Array.from(e.target.files || []);
    setImageFiles(picked);
  };

  const removePickedImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (boardId) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    await axiosInstance.post(`/api/board/posts/${boardId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const uploadImages = async (boardId) => {
    if (!imageFiles || imageFiles.length === 0) return [];

    const formData = new FormData();
    imageFiles.forEach((f) => formData.append("photos", f));

    const res = await axiosInstance.post(`/api/board/posts/${boardId}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data || [];
  };

  // ==========================
  // AI 글써주기
  // ==========================
  const canUseAiWrite = useMemo(() => {
    return activeCategory?.aiWriteYn === "Y";
  }, [activeCategory]);

  const onAiWrite = async () => {
    if (!categoryId) {
      alert("categoryId가 없습니다.");
      return;
    }
    if (!canUseAiWrite) {
      alert("이 카테고리는 AI 글쓰기 기능이 꺼져있습니다.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    try {
      // 최소 입력만 전달 (title/content 비어도 서버에서 처리하도록 설계 가능)
      const payload = {
        title: form.title || "",
        content: form.content || "",
        force: true,      // 캐시 정책 쓰면 false/true 선택
        truncate: true,
      };

      // 백엔드 엔드포인트: /api/board/ai/write/{categoryId}
      const res = await axiosInstance.post(`/api/board/ai/write/${categoryId}`, payload);
      const text = res.data?.resultText || "";

      if (!text.trim()) {
        setAiError("AI가 빈 결과를 반환했습니다.");
        return;
      }

      // 1) 미리보기로 보여주고 사용자가 적용 버튼을 누르게 하고 싶으면:
      setAiDraft(text);

      // 2) 즉시 content에 덮어쓰고 싶으면 아래 주석 해제:
      // setForm((prev) => ({ ...prev, content: text }));

    } catch (err) {
      const status = err.response?.status;
      if (status === 401) setAiError("로그인이 필요합니다.");
      else if (status === 403) setAiError(err.response?.data?.error || "권한/정책상 사용 불가");
      else if (status === 404) setAiError("카테고리를 찾을 수 없습니다.");
      else setAiError("AI 호출 실패");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiDraftToContent = () => {
    if (!aiDraft.trim()) return;
    setForm((prev) => ({ ...prev, content: aiDraft }));
    setAiDraft("");
  };

  const appendAiDraftToContent = () => {
    if (!aiDraft.trim()) return;
    setForm((prev) => ({ ...prev, content: (prev.content || "") + "\n\n" + aiDraft }));
    setAiDraft("");
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

      const res = await axiosInstance.post("/api/board/posts", payload);
      const saved = res.data;

      try {
        if (activeCategory?.fileYn === "Y") {
          await uploadFiles(saved.boardId);
        }
      } catch (fileErr) {
        console.error(fileErr);
        alert("글은 등록됐지만 첨부파일 업로드에 실패했습니다. (수정에서 다시 올리세요)");
      }

      try {
        const uploadedPhotos = await uploadImages(saved.boardId);

        if (uploadedPhotos.length > 0) {
          const tokens = uploadedPhotos.map((p) => `\n[img:${p.photoId}]\n`).join("");
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
              disabled={loading || aiLoading}
            />
          </div>

          {/* AI 글써주기: 카테고리 정책이 Y일 때만 표시 */}
          {canUseAiWrite && (
            <div className="mb-3 p-3 rounded-4" style={{ background: "#fff7e6" }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="fw-semibold">AI 글써주기</div>
                  <div className="text-secondary small">
                    제목/내용에 적어둔 키워드 기반으로 초안을 다듬어줍니다. 없는 내용은 만들지 않게 설계하세요.
                  </div>
                </div>
                <button className="btn btn-outline-primary" type="button" onClick={onAiWrite} disabled={aiLoading || loading}>
                  {aiLoading ? "생성중..." : "초안 생성"}
                </button>
              </div>

              {aiError && <div className="alert alert-danger mt-3 mb-0">{aiError}</div>}

              {aiDraft && (
                <div className="mt-3">
                  <label className="form-label fw-semibold">AI 초안 미리보기</label>
                  <textarea className="form-control" rows={6} value={aiDraft} readOnly />
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-primary" type="button" onClick={applyAiDraftToContent} disabled={loading}>
                      본문에 적용(덮어쓰기)
                    </button>
                    <button className="btn btn-outline-primary" type="button" onClick={appendAiDraftToContent} disabled={loading}>
                      본문에 추가(이어붙이기)
                    </button>
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setAiDraft("")} disabled={loading}>
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-2">
            <label className="form-label fw-semibold">내용</label>

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
