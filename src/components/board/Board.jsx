import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool";

const Board = () => {
  const navigate = useNavigate();

  // 카테고리
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const activeCategory = useMemo(
    () => categories.find((c) => Number(c.categoryId) === Number(activeCategoryId)) || null,
    [categories, activeCategoryId]
  );

  // 검색/페이징
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalPages = pageInfo?.totalPages ?? 0;
  const currentPage = pageInfo?.page ?? page;

  const hasPrev = pageInfo?.hasPrev ?? (page > 0);
  const hasNext = pageInfo?.hasNext ?? (pageInfo ? !pageInfo.last : false);

  const pageNumbers = useMemo(() => {
    const start = Math.floor(currentPage / 5) * 5;
    const end = Math.min(start + 5, totalPages);
    return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  // 카테고리 조회
  const fetchCategories = async () => {
    setError("");
    try {
      const res = await axiosInstance.get("/api/board/categories/list");
      const list = res.data || [];
      setCategories(list);

      if (list.length > 0 && !activeCategoryId) {
        setActiveCategoryId(list[0].categoryId);
      }
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError("카테고리 목록 조회 실패");
    }
  };

  // 게시글 목록 조회 (연동)
  const fetchPosts = async () => {
    if (!activeCategoryId) return;

    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get("/api/board/posts", {
        params: {
          categoryId: activeCategoryId,
          keyword: query || undefined,
          page,
          size,
        },
      });

      const data = res.data;
      setRows(data?.content || []);
      setPageInfo(data || null);
    } catch (err) {
      if (err.response?.status === 401) setError("로그인이 필요합니다.");
      else if (err.response?.status === 403) setError("권한이 없습니다.");
      else setError("게시글 목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 게시판에서 "브라우저 뒤로가기"를 눌러도 HOME으로 보내기
  useEffect(() => {
    const onPopState = () => {
      navigate("/", { replace: true });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);

  // 카테고리/검색/페이징 바뀌면 목록 재조회
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId, query, page, size]);

  const onSearch = () => {
    setPage(0);
    setQuery(keyword.trim());
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") onSearch();
  };

  const goWrite = () => {
    if (!activeCategoryId) return;
    navigate(`/board/write?categoryId=${activeCategoryId}`);
  };

  const goRead = (boardId) => {
    navigate(`/board/read/${boardId}`);
  };

  const goPrev = () => {
    if (hasPrev) setPage((p) => Math.max(0, p - 1));
  };

  const goNext = () => {
    if (hasNext) setPage((p) => p + 1);
  };

  // ✅ 게시판 상단 "뒤로" 버튼: 무조건 홈으로
  const goHome = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h2 className="fw-bold m-0">게시판</h2>
          <div className="text-secondary small">카테고리별 게시글 목록</div>
        </div>

        {/* ✅ 뒤로(홈으로) */}
        <button className="btn btn-outline-secondary" onClick={goHome}>
          뒤로
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        {/* 카테고리 */}
        <div className="col-lg-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3">
              <div className="fw-bold mb-2">카테고리</div>

              <div className="list-group">
                {categories.length === 0 ? (
                  <div className="text-secondary small py-3">카테고리가 없습니다.</div>
                ) : (
                  categories.map((c) => (
                    <button
                      key={c.categoryId}
                      type="button"
                      className={`list-group-item list-group-item-action rounded-3 mb-2 ${
                        Number(c.categoryId) === Number(activeCategoryId) ? "active" : ""
                      }`}
                      style={{
                        border: "1px solid #eef2f7",
                        backgroundColor:
                          Number(c.categoryId) === Number(activeCategoryId) ? "#16a34a" : "#f8fafc",
                        color: Number(c.categoryId) === Number(activeCategoryId) ? "white" : "#111827",
                      }}
                      onClick={() => {
                        setActiveCategoryId(c.categoryId);
                        setPage(0);
                        setKeyword("");
                        setQuery("");
                      }}
                    >
                      <div className="fw-semibold">{c.categoryName}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 게시글 목록 */}
        <div className="col-lg-9">
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="fw-bold fs-5">{activeCategory ? activeCategory.categoryName : "카테고리 선택"}</div>
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  <input
                    className="form-control"
                    style={{ width: 260 }}
                    placeholder="제목/작성자 검색"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={!activeCategoryId}
                  />
                  <button className="btn btn-success" onClick={onSearch} disabled={loading || !activeCategoryId}>
                    검색
                  </button>
                  <button className="btn btn-outline-success" onClick={goWrite} disabled={!activeCategoryId}>
                    글쓰기
                  </button>
                </div>
              </div>

              <div className="row g-2 align-items-center mt-3">
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={size}
                    onChange={(e) => {
                      setPage(0);
                      setSize(Number(e.target.value));
                    }}
                    disabled={!activeCategoryId}
                  >
                    <option value={10}>10개</option>
                    <option value={20}>20개</option>
                    <option value={50}>50개</option>
                  </select>
                </div>

                <div className="col-md-10 text-end text-secondary small">
                  총 {pageInfo?.totalElements ?? 0}건 / {totalPages}페이지
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 90 }}>No</th>
                      <th>제목</th>
                      <th style={{ width: 160 }}>작성자</th>
                      <th style={{ width: 180 }}>작성일</th>
                      <th style={{ width: 110 }}>조회</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!activeCategoryId ? (
                      <tr>
                        <td colSpan={5} className="text-center py-5 text-secondary">
                          카테고리를 선택하세요.
                        </td>
                      </tr>
                    ) : loading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-5 text-secondary">
                          로딩중...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-5 text-secondary">
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, idx) => (
                        <tr key={r.boardId}>
                          <td>{page * size + idx + 1}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-decoration-none fw-semibold"
                              onClick={() => goRead(r.boardId)}
                            >
                              {r.title} {r.secretYn === "Y" ? " (비밀)" : ""}
                            </button>
                          </td>
                          <td>{r.writerName ?? r.loginId ?? "-"}</td>
                          <td>{r.createdAt ?? "-"}</td>
                          <td>{r.viewCnt ?? 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center p-3">
                <button className="btn btn-outline-secondary" onClick={goPrev} disabled={!hasPrev || loading}>
                  이전
                </button>

                <div className="d-flex gap-2 flex-wrap justify-content-center">
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      className={`btn ${p === currentPage ? "btn-success" : "btn-outline-success"}`}
                      onClick={() => setPage(p)}
                      disabled={loading}
                    >
                      {p + 1}
                    </button>
                  ))}
                </div>

                <button className="btn btn-outline-secondary" onClick={goNext} disabled={!hasNext || loading}>
                  다음
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
