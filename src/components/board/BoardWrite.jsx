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

  // 첨부파일
  const [files, setFiles] = useState([]);

  // 이미지
  const imgRef = useRef(null);

  // ✅ 이미지 + 검증상태를 함께 관리
  // { file, status: "PENDING"|"OK"|"BLOCKED", reasonCode?, reasonText? }
  const [imageItems, setImageItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // AI draft UI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDraft, setAiDraft] = useState(""); // 미리보기용

  // ✅ 이미지 차단 여부
  const hasBlockedImage = useMemo(
    () => imageItems.some((x) => x.status === "BLOCKED"),
    [imageItems]
  );

  // ✅ 업로드 가능한(OK) 이미지 파일만 추출
  const okImageFiles = useMemo(
    () => imageItems.filter((x) => x.status === "OK").map((x) => x.file),
    [imageItems]
  );

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

  // ==========================
  // ✅ 이미지 사전검증(precheck)
  // - 너가 말한 엔드포인트가 이미 있음: /api/board/photos/precheck
  // - 응답은 아래처럼 온다고 가정:
  //   [{ filename, allowed, reasonCode, reasonText, score }, ...]
  // ==========================
  const precheckImages = async (pickedFiles) => {
    if (!pickedFiles || pickedFiles.length === 0) return [];

    const formData = new FormData();
    pickedFiles.forEach((f) => formData.append("photos", f));

    const res = await axiosInstance.post("/api/board/photos/precheck", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data || [];
  };

  // ✅ 파일 선택 순간에 바로 검사 + 결과 UI 표시
  const onPickImages = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    // 같은 파일 다시 선택 가능하게 input 초기화
    if (imgRef.current) imgRef.current.value = "";

    // 1) PENDING 표시
    setImageItems(picked.map((f) => ({ file: f, status: "PENDING" })));

    try {
      const results = await precheckImages(picked);

      // 결과가 순서대로 온다는 전제(대부분 그렇게 구현됨)
      const next = picked.map((f, idx) => {
        const r = results[idx];

        // 응답 누락 시: 보수적으로 막고 싶으면 BLOCKED로 바꿔도 됨
        if (!r) return { file: f, status: "OK" };

        if (r.allowed === true) {
          return { file: f, status: "OK" };
        }

        return {
          file: f,
          status: "BLOCKED",
          reasonCode: r.reasonCode || "OTHER",
          reasonText: r.reasonText || "업로드 불가 이미지",
        };
      });

      setImageItems(next);
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // 서버/AI 장애 시: 너희 정책이 "보수적으로 막기"이므로 차단 처리
      setImageItems(
        picked.map((f) => ({
          file: f,
          status: "BLOCKED",
          reasonCode: "FASTAPI_ERROR",
          reasonText: "이미지 판별 서버 오류로 업로드할 수 없습니다.",
        }))
      );
    }
  };

  const removePickedImage = (index) => {
    setImageItems((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (boardId) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    await axiosInstance.post(`/api/board/posts/${boardId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  // ✅ OK 이미지 파일만 업로드
  const uploadImages = async (boardId) => {
    if (!okImageFiles || okImageFiles.length === 0) return [];

    const formData = new FormData();
    okImageFiles.forEach((f) => formData.append("photos", f));

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
      const payload = {
        title: form.title || "",
        content: form.content || "",
        force: true,
        truncate: true,
      };

      const res = await axiosInstance.post(`/api/board/ai/write/${categoryId}`, payload);
      const text = res.data?.resultText || "";

      if (!text.trim()) {
        setAiError("AI가 빈 결과를 반환했습니다.");
        return;
      }

      setAiDraft(text);
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

    // ✅ 1) 등록 직전: 차단 이미지가 있으면 글 등록 자체를 막는다
    if (hasBlockedImage) {
      const reasons = imageItems
        .filter((x) => x.status === "BLOCKED")
        .map((x) => x.reasonText || "업로드 불가 이미지")
        .join("\n");
      alert(`유해/상업적 이미지가 포함되어 업로드할 수 없습니다.\n\n${reasons}`);
      return;
    }

    // ✅ 2) 등록 직전 재검증(필수 안전장치)
    // - 선택 후 시간이 지나도(교체/조작/서버정책변경) 등록 단계에서 다시 막을 수 있음
    if (imageItems.length > 0) {
      try {
        const picked = imageItems.map((x) => x.file);
        // PENDING이면 기다리는게 맞으니 막는다
        if (imageItems.some((x) => x.status === "PENDING")) {
          alert("이미지 검사가 진행 중입니다. 잠시만 기다려주세요.");
          return;
        }

        const results = await precheckImages(picked);

        const refreshed = picked.map((f, idx) => {
          const r = results[idx];
          if (!r) return { file: f, status: "OK" };
          if (r.allowed === true) return { file: f, status: "OK" };
          return {
            file: f,
            status: "BLOCKED",
            reasonCode: r.reasonCode || "OTHER",
            reasonText: r.reasonText || "업로드 불가 이미지",
          };
        });

        setImageItems(refreshed);

        if (refreshed.some((x) => x.status === "BLOCKED")) {
          const reasons = refreshed
            .filter((x) => x.status === "BLOCKED")
            .map((x) => x.reasonText || "업로드 불가 이미지")
            .join("\n");
          alert(`유해/상업적 이미지가 포함되어 업로드할 수 없습니다.\n\n${reasons}`);
          return;
        }
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        alert("이미지 판별 서버 오류로 업로드를 진행할 수 없습니다.");
        return;
      }
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

      // ✅ 여기부터 글 등록 진행(이미지 검증 통과한 상태)
      const res = await axiosInstance.post("/api/board/posts", payload);
      const saved = res.data;

      // 첨부파일 업로드(실패해도 글은 유지)
      try {
        if (activeCategory?.fileYn === "Y") {
          await uploadFiles(saved.boardId);
        }
      } catch (fileErr) {
        console.error(fileErr);
        alert("글은 등록됐지만 첨부파일 업로드에 실패했습니다. (수정에서 다시 올리세요)");
      }

      // 이미지 업로드(OK 이미지만)
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

          {/* AI 글써주기 */}
          {canUseAiWrite && (
            <div className="mb-3 p-3 rounded-4" style={{ background: "#fff7e6" }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="fw-semibold">AI 글써주기</div>
                  <div className="text-secondary small">제목/내용에 적어둔 키워드 기반으로 초안을 다듬어줍니다.</div>
                </div>
                <button
                  className="btn btn-outline-primary"
                  type="button"
                  onClick={onAiWrite}
                  disabled={aiLoading || loading}
                >
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

              {imageItems.length > 0 && (
                <div className="text-secondary small align-self-center">선택됨: {imageItems.length}개</div>
              )}
            </div>

            {/* ✅ 차단 이미지 안내(가시적으로) */}
            {hasBlockedImage && (
              <div className="alert alert-danger py-2">
                유해/상업적 이미지가 포함되어 업로드할 수 없습니다. 이미지를 제거하거나 다른 이미지로 교체하세요.
              </div>
            )}

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

          {/* ✅ 이미지 목록 + 검사 상태/사유 표시 */}
          {imageItems.length > 0 && (
            <div className="mt-2 d-flex flex-column gap-1 mb-3">
              {imageItems.map((it, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center border rounded p-2">
                  <div className="small">
                    {it.file.name} <span className="text-secondary">({it.file.size} bytes)</span>{" "}
                    {it.status === "PENDING" && <span className="text-secondary">(검사중)</span>}
                    {it.status === "OK" && <span className="text-success">(통과)</span>}
                    {it.status === "BLOCKED" && (
                      <span className="text-danger">(차단: {it.reasonText || "업로드 불가"})</span>
                    )}
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

            {/* ✅ 검사중/차단이면 등록 자체가 안 되게 disable도 걸어둠(UX 강화) */}
            <button
              className="btn btn-success"
              onClick={onSubmit}
              disabled={loading || imageItems.some((x) => x.status === "PENDING") || hasBlockedImage}
              title={
                imageItems.some((x) => x.status === "PENDING")
                  ? "이미지 검사중입니다."
                  : hasBlockedImage
                  ? "차단된 이미지가 있어 등록할 수 없습니다."
                  : ""
              }
            >
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardWrite;
