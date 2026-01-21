import React, { useEffect, useMemo, useState } from "react";
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

  // 모달 상태
  const [open, setOpen] = useState(false);

  // 입력값
  const [reasonCode, setReasonCode] = useState("");
  const [reasonText, setReasonText] = useState("");

  const reasonOptions = useMemo(
    () => [
      { value: "GAMBLING", label: "사행성(도박/불법베팅)" },
      { value: "OFFENSIVE", label: "불쾌감(혐오/욕설/비방)" },
      { value: "SPAM", label: "스팸/광고" },
      { value: "ILLEGAL", label: "불법/위법 소지" },
      { value: "PERSONAL_INFO", label: "개인정보 노출" },
      { value: "OTHER", label: "기타" },
    ],
    []
  );

  useEffect(() => {
    // 게시글 바뀌면 상태 리셋
    setHidden(false);
    setOpen(false);
    setLoading(false);
    setReasonCode("");
    setReasonText("");
  }, [boardId]);

  const openModal = () => {
    if (!boardId || loading) return;
    setOpen(true);
  };

  const closeModal = () => {
    if (loading) return;
    setOpen(false);
    // 닫을 때 입력 유지/초기화는 취향인데, 보통 초기화 추천
    setReasonCode("");
    setReasonText("");
  };

  const validate = () => {
    if (!reasonCode) return "신고 유형을 선택해주세요.";
    // 기타 선택 시 간단 사유 필수 처리(원하면 유지)
    if (reasonCode === "OTHER" && reasonText.trim().length < 2) {
      return "기타 사유는 간단 내용을 입력해주세요.";
    }
    // 너무 길면 DB 컬럼(500) 고려
    if (reasonText && reasonText.length > 500) return "사유 내용은 500자 이내로 입력해주세요.";
    return null;
  };

  const submitReport = async () => {
    if (!boardId || loading) return;

    const msg = validate();
    if (msg) {
      alert(msg);
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post(`/api/board/posts/${boardId}/reports`, {
        reasonCode,
        reasonText: reasonText.trim() ? reasonText.trim() : null,
      });
      alert("신고가 접수되었습니다.");
      closeModal();
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) alert("로그인이 필요합니다.");
      else if (status === 403) {
        // reportYn = N
        setHidden(true);
        closeModal();
      } else if (status === 409) alert("이미 신고한 게시글입니다.");
      else if (status === 400) alert(err.response?.data?.message || "입력값을 확인해주세요.");
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
        onClick={openModal}
        disabled={loading}
      >
        신고
      </button>

      {/* 간단 모달 (Bootstrap 스타일만 사용) */}
      {open && (
        <>
          {/* backdrop */}
          <div
            className="modal-backdrop fade show"
            onClick={closeModal}
          />

          <div
            className="modal fade show"
            tabIndex="-1"
            style={{ display: "block" }}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">

                <div className="modal-header">
                  <h5 className="modal-title">게시글 신고</h5>
                  <button type="button" className="btn-close" onClick={closeModal} disabled={loading} />
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">신고 유형</label>
                    <select
                      className="form-select"
                      value={reasonCode}
                      onChange={(e) => setReasonCode(e.target.value)}
                      disabled={loading}
                    >
                      <option value="">선택해주세요</option>
                      {reasonOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label">
                      간단 내용 (선택)
                      {reasonCode === "OTHER" ? " - 기타 선택 시 필수" : ""}
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={reasonText}
                      onChange={(e) => setReasonText(e.target.value)}
                      maxLength={500}
                      disabled={loading}
                      placeholder="예) 광고 링크가 반복적으로 포함되어 있습니다."
                    />
                    <div className="form-text">{reasonText.length}/500</div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={loading}>
                    취소
                  </button>
                  <button type="button" className="btn btn-danger" onClick={submitReport} disabled={loading}>
                    {loading ? "처리중..." : "신고 접수"}
                  </button>
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BoardReport;
