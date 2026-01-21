import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

const ynOptions = ["Y", "N"];
const policyOptions = ["ADMIN_ONLY", "LOGIN_ANY"];

const AdminCateGory = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    categoryName: "",
    sortNo: 0,
    writePolicy: "LOGIN_ANY",
    visibleYn: "Y",
    commentYn: "Y",
    reportYn: "Y",
    likeYn: "Y",
    fileYn: "Y",
    secretYn: "N",

    // AI 토글 3개
    aiSummaryYn: "N",
    aiSentimentYn: "N",
    aiWriteYn: "N",
  });

  const [editingId, setEditingId] = useState(null);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const sa = a.sortNo ?? 0;
      const sb = b.sortNo ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.categoryId ?? 0) - (b.categoryId ?? 0);
    });
  }, [rows]);

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("/api/admin/board/categories/list");
      setRows(res.data || []);
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
      else setError("조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setMessage("");
    setForm({
      categoryName: "",
      sortNo: 0,
      writePolicy: "LOGIN_ANY",
      visibleYn: "Y",
      commentYn: "Y",
      reportYn: "Y",
      likeYn: "Y",
      fileYn: "Y",
      secretYn: "N",
      aiSummaryYn: "N",
      aiSentimentYn: "N",
      aiWriteYn: "N",
    });
  };

  const startEdit = (r) => {
    setMessage("");
    setEditingId(r.categoryId);
    setForm({
      categoryName: r.categoryName ?? "",
      sortNo: r.sortNo ?? 0,
      writePolicy: r.writePolicy ?? "LOGIN_ANY",
      visibleYn: r.visibleYn ?? "Y",
      commentYn: r.commentYn ?? "Y",
      reportYn: r.reportYn ?? "Y",
      likeYn: r.likeYn ?? "Y",
      fileYn: r.fileYn ?? "Y",
      secretYn: r.secretYn ?? "N",
      aiSummaryYn: r.aiSummaryYn ?? "N",
      aiSentimentYn: r.aiSentimentYn ?? "N",
      aiWriteYn: r.aiWriteYn ?? "N",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "sortNo" ? Number(value) : value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.categoryName.trim()) {
      setError("카테고리명은 필수입니다.");
      return;
    }

    const payload = {
      categoryName: form.categoryName.trim(),
      sortNo: form.sortNo ?? 0,
      writePolicy: form.writePolicy,
      visibleYn: form.visibleYn,
      commentYn: form.commentYn,
      reportYn: form.reportYn,
      likeYn: form.likeYn,
      fileYn: form.fileYn,
      secretYn: form.secretYn,

      aiSummaryYn: form.aiSummaryYn,
      aiSentimentYn: form.aiSentimentYn,
      aiWriteYn: form.aiWriteYn,
    };

    try {
      if (editingId) {
        await axiosInstance.put(`/api/admin/board/categories/${editingId}`, payload);
        setMessage("수정 완료");
      } else {
        await axiosInstance.post("/api/admin/board/categories", payload);
        setMessage("등록 완료");
      }
      resetForm();
      fetchList();
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
      else if (err.response?.status === 409) setError("이미 존재하는 카테고리명입니다.");
      else setError("저장 실패");
    }
  };

  const onDelete = async (id) => {
    setError("");
    setMessage("");

    if (!window.confirm("삭제하시겠습니까?")) return;

    try {
      await axiosInstance.delete(`/api/admin/board/categories/${id}`);
      setMessage("삭제 완료");
      if (editingId === id) resetForm();
      fetchList();
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
      else setError("삭제 실패");
    }
  };

  const quickToggle = async (r, field) => {
    setError("");
    setMessage("");

    const next = (r?.[field] ?? "N") === "Y" ? "N" : "Y";

    const payload = {
      categoryName: r.categoryName,
      sortNo: r.sortNo ?? 0,
      writePolicy: r.writePolicy ?? "LOGIN_ANY",
      visibleYn: r.visibleYn ?? "Y",
      commentYn: r.commentYn ?? "Y",
      reportYn: r.reportYn ?? "Y",
      likeYn: r.likeYn ?? "Y",
      fileYn: r.fileYn ?? "Y",
      secretYn: r.secretYn ?? "N",

      aiSummaryYn: r.aiSummaryYn ?? "N",
      aiSentimentYn: r.aiSentimentYn ?? "N",
      aiWriteYn: r.aiWriteYn ?? "N",

      [field]: next,
    };

    try {
      await axiosInstance.put(`/api/admin/board/categories/${r.categoryId}`, payload);
      fetchList();
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("관리자 권한이 없습니다.");
      else setError("변경 실패");
    }
  };

  if (error) {
    return (
      <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold m-0">카테고리 관리</h2>
          <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/dashboard")}>
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
          <h2 className="fw-bold m-0">카테고리 관리</h2>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/dashboard")}>
          뒤로
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4 mb-3">
        <div className="card-body p-3 p-md-4">
          <form onSubmit={onSubmit}>
            <div className="row g-2 align-items-center">
              <div className="col-md-5">
                <label className="form-label small text-secondary mb-1">Category Name</label>
                <input
                  className="form-control"
                  name="categoryName"
                  value={form.categoryName}
                  onChange={onChange}
                  placeholder="공지사항 / 뉴스 / 자유게시판"
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small text-secondary mb-1">Sort No</label>
                <input className="form-control" type="number" name="sortNo" value={form.sortNo} onChange={onChange} />
              </div>

              <div className="col-md-3">
                <label className="form-label small text-secondary mb-1">권한</label>
                <select className="form-select" name="writePolicy" value={form.writePolicy} onChange={onChange}>
                  {policyOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2 d-grid">
                <button className="btn btn-success mt-md-4" type="submit" disabled={loading}>
                  {editingId ? "수정" : "등록"}
                </button>
              </div>
            </div>

            <div className="mt-3 p-3 rounded-4" style={{ background: "#f8f9fa" }}>
              <div className="fw-semibold mb-2">게시판 기능</div>
              <div className="row g-2 align-items-center">
                {[
                  ["visibleYn", "VISIBLE"],
                  ["commentYn", "댓글"],
                  ["reportYn", "신고"],
                  ["likeYn", "좋아요"],
                  ["fileYn", "파일"],
                  ["secretYn", "비밀글"],
                ].map(([name, label]) => (
                  <div className="col-md-2" key={name}>
                    <label className="form-label small text-secondary mb-1">{label}</label>
                    <select className="form-select" name={name} value={form[name]} onChange={onChange}>
                      {ynOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 p-3 rounded-4" style={{ background: "#fff7e6" }}>
              <div className="fw-semibold mb-2">AI 기능</div>
              <div className="row g-2 align-items-center">
                <div className="col-md-3">
                  <label className="form-label small text-secondary mb-1">AI 요약</label>
                  <select className="form-select" name="aiSummaryYn" value={form.aiSummaryYn} onChange={onChange}>
                    {ynOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small text-secondary mb-1">AI 호재/악재</label>
                  <select className="form-select" name="aiSentimentYn" value={form.aiSentimentYn} onChange={onChange}>
                    {ynOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small text-secondary mb-1">AI 글작성</label>
                  <select className="form-select" name="aiWriteYn" value={form.aiWriteYn} onChange={onChange}>
                    {ynOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3 text-secondary small">
                  운영 팁: 뉴스는 요약/호재, 자유는 글작성만 켜는 식으로 분리하면 좋습니다.
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-outline-secondary" type="button" onClick={resetForm} disabled={loading}>
                초기화
              </button>
              <button className="btn btn-outline-secondary" type="button" onClick={fetchList} disabled={loading}>
                새로고침
              </button>
              {message && <div className="text-success small d-flex align-items-center ms-2">{message}</div>}
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th style={{ width: 220 }}>분류</th>
                  <th style={{ width: 90 }}>Sort</th>
                  <th style={{ width: 170 }}>권한</th>
                  <th style={{ width: 90 }}>Visible</th>
                  <th style={{ width: 90 }}>댓글</th>
                  <th style={{ width: 90 }}>신고</th>
                  <th style={{ width: 90 }}>좋아요</th>
                  <th style={{ width: 90 }}>파일</th>
                  <th style={{ width: 90 }}>비밀글</th>
                  <th style={{ width: 110 }}>AI 요약</th>
                  <th style={{ width: 130 }}>AI호재/악재</th>
                  <th style={{ width: 110 }}>AI 글작성</th>
                  <th style={{ width: 160 }}>기능</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={14} className="text-center py-5 text-secondary">
                      로딩중...
                    </td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-5 text-secondary">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((r) => (
                    <tr key={r.categoryId}>
                      <td>{r.categoryId}</td>
                      <td className="fw-semibold">{r.categoryName}</td>
                      <td>{r.sortNo}</td>
                      <td>{r.writePolicy}</td>

                      {[
                        ["visibleYn", "visibleYn"],
                        ["commentYn", "commentYn"],
                        ["reportYn", "reportYn"],
                        ["likeYn", "likeYn"],
                        ["fileYn", "fileYn"],
                        ["secretYn", "secretYn"],
                      ].map(([field, key]) => (
                        <td key={key}>
                          <button
                            className={`btn btn-sm ${r[field] === "Y" ? "btn-success" : "btn-outline-secondary"}`}
                            onClick={() => quickToggle(r, field)}
                            disabled={loading}
                          >
                            {r[field]}
                          </button>
                        </td>
                      ))}

                      <td>
                        <button
                          className={`btn btn-sm ${r.aiSummaryYn === "Y" ? "btn-success" : "btn-outline-secondary"}`}
                          onClick={() => quickToggle(r, "aiSummaryYn")}
                          disabled={loading}
                        >
                          {r.aiSummaryYn ?? "N"}
                        </button>
                      </td>

                      <td>
                        <button
                          className={`btn btn-sm ${r.aiSentimentYn === "Y" ? "btn-success" : "btn-outline-secondary"}`}
                          onClick={() => quickToggle(r, "aiSentimentYn")}
                          disabled={loading}
                        >
                          {r.aiSentimentYn ?? "N"}
                        </button>
                      </td>

                      <td>
                        <button
                          className={`btn btn-sm ${r.aiWriteYn === "Y" ? "btn-success" : "btn-outline-secondary"}`}
                          onClick={() => quickToggle(r, "aiWriteYn")}
                          disabled={loading}
                        >
                          {r.aiWriteYn ?? "N"}
                        </button>
                      </td>

                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(r)} disabled={loading}>
                            수정
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(r.categoryId)} disabled={loading}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 d-flex justify-content-between align-items-center">
            <div className="text-secondary small">총 {sortedRows.length}개</div>
            <button className="btn btn-outline-secondary" onClick={fetchList} disabled={loading}>
              새로고침
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCateGory;
