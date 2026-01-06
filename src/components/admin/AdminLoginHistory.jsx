import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../Tool"; // 경로 맞춰 수정

const AdminLoginHistory = () => {
    const navigate = useNavigate();

    const [keyword, setKeyword] = useState("");
    const [query, setQuery] = useState("");

    const [from, setFrom] = useState(""); // yyyy-mm-dd
    const [to, setTo] = useState("");

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);

    const [rows, setRows] = useState([]);
    const [pageInfo, setPageInfo] = useState(null);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const totalPages = pageInfo?.totalPages ?? 0;

    const pageNumbers = useMemo(() => {
        const current = pageInfo?.page ?? page;
        const start = Math.floor(current / 5) * 5;
        const end = Math.min(start + 5, totalPages);
        return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
    }, [pageInfo, page, totalPages]);

    const fetchList = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosInstance.get("/api/admin/login-histories", {
                params: {
                    keyword: query,
                    page,
                    size,
                    from: from || undefined,
                    to: to || undefined,
                },
            });
            setRows(res.data.content || []);
            setPageInfo(res.data);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, page, size, from, to]);

    const onSearch = () => {
        setPage(0);
        setQuery(keyword.trim());
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter") onSearch();
    };

    const goPrev = () => {
        if (pageInfo?.hasPrev) setPage((p) => Math.max(0, p - 1));
    };

    const goNext = () => {
        if (pageInfo?.hasNext) setPage((p) => p + 1);
    };

    // ✅ 기간 삭제
    const purgeByPeriod = async () => {
        if (!from || !to) {
            alert("삭제 기간(from/to)을 선택하세요.");
            return;
        }

        if (!window.confirm(`${from} ~ ${to} 기간의 로그인 이력을 삭제할까요?`)) return;

        try {
            await axiosInstance.post("/api/admin/login-histories/purge", null, {
                params: { from, to },
            });
            alert("기간 삭제 완료");
            setPage(0);
            fetchList();
        } catch (err) {
            if (err.response?.status === 404) alert("미구현.");
            else if (err.response?.status === 401) alert("로그인이 필요합니다.");
            else if (err.response?.status === 403) alert("관리자 권한이 없습니다.");
            else alert("삭제 실패");
        }
    };

    // ✅ 단일 삭제
    const deleteOne = async (historyId) => {
        if (!window.confirm(`이력ID ${historyId} 를 삭제할까요?`)) return;

        try {
            await axiosInstance.delete(`/api/admin/login-histories/${historyId}`);
            alert("삭제 완료");

            // 현재 페이지에 1개만 남아있었으면 이전 페이지로 이동(빈 페이지 방지)
            if ((rows?.length ?? 0) === 1 && page > 0) {
                setPage(page - 1);
            } else {
                fetchList();
            }
        } catch (err) {
            if (err.response?.status === 401) alert("로그인이 필요합니다.");
            else if (err.response?.status === 403) alert("관리자 권한이 없습니다.");
            else alert("단일 삭제 실패");
        }
    };

    if (error) {
        return (
            <div className="container py-5" style={{ fontFamily: "'Pretendard', sans-serif" }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="fw-bold m-0">로그인 이력</h2>
                    <button className="btn btn-outline-secondary" onClick={() => navigate("/admin")}>
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
                    <h2 className="fw-bold m-0">로그인 이력</h2>
                    <div className="text-secondary small mt-1">기간 조회 / 기간 삭제 / 단일 삭제</div>
                </div>
                <button className="btn btn-outline-secondary" onClick={() => navigate("/admin")}>
                    뒤로
                </button>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-3">
                <div className="card-body p-3 p-md-4">
                    <div className="row g-2 align-items-center">
                        <div className="col-md-5">
                            <input
                                className="form-control"
                                placeholder="검색 (아이디 / 이름 / IP)"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={onKeyDown}
                            />
                        </div>
                        <div className="col-md-2 d-grid">
                            <button className="btn btn-success" onClick={onSearch} disabled={loading}>
                                검색
                            </button>
                        </div>
                        <div className="col-md-2">
                            <select
                                className="form-select"
                                value={size}
                                onChange={(e) => {
                                    setPage(0);
                                    setSize(Number(e.target.value));
                                }}
                            >
                                <option value={10}>10개</option>
                                <option value={20}>20개</option>
                                <option value={50}>50개</option>
                            </select>
                        </div>
                    </div>

                    <div className="row g-2 align-items-center mt-3">
                        <div className="col-md-3">
                            <label className="form-label small text-secondary mb-1">From</label>
                            <input className="form-control" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small text-secondary mb-1">To</label>
                            <input className="form-control" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                        <div className="col-md-3 d-grid">
                            <button className="btn btn-outline-danger mt-md-4" onClick={purgeByPeriod} disabled={loading}>
                                기간 삭제
                            </button>
                        </div>
                        <div className="col-md-3">
                            <div className="text-secondary small mt-4">
                                총 {pageInfo?.totalElements ?? 0}건 / {totalPages}페이지
                            </div>
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
                                    <th style={{ width: 180 }}>로그인ID</th>
                                    <th style={{ width: 160 }}>이름</th>
                                    <th style={{ width: 220 }}>로그인시각</th>
                                    <th style={{ width: 170 }}>IP</th>
                                    <th style={{ width: 90 }}>성공</th>
                                    <th style={{ width: 110 }}>삭제</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5 text-secondary">
                                            로딩중...
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5 text-secondary">
                                            데이터가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r, idx) => (
                                        <tr key={r.historyId}>
                                            <td>{(page * size) + idx + 1}</td>   {/* ✅ 화면용 연속번호 */}
                                            <td>{r.loginId}</td>
                                            <td>{r.name}</td>
                                            <td>{r.loginAt}</td>
                                            <td>{r.loginIp || "-"}</td>
                                            <td>{r.successYn}</td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => deleteOne(r.historyId)}
                                                    disabled={loading}
                                                >
                                                    삭제
                                                </button>
                                            </td>
                                        </tr>
                                    ))

                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-3">
                        <button className="btn btn-outline-secondary" onClick={goPrev} disabled={!pageInfo?.hasPrev || loading}>
                            이전
                        </button>

                        <div className="d-flex gap-2 flex-wrap justify-content-center">
                            {pageNumbers.map((p) => (
                                <button
                                    key={p}
                                    className={`btn ${p === (pageInfo?.page ?? page) ? "btn-success" : "btn-outline-success"}`}
                                    onClick={() => setPage(p)}
                                    disabled={loading}
                                >
                                    {p + 1}
                                </button>
                            ))}
                        </div>

                        <button className="btn btn-outline-secondary" onClick={goNext} disabled={!pageInfo?.hasNext || loading}>
                            다음
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginHistory;
