import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchActiveTemplate } from "./checklistApi";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ChecklistRun() {
  const navigate = useNavigate();
  const query = useQuery();
  const type = (query.get("type") || "PRE").toUpperCase();

  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setTemplate(null);

    fetchActiveTemplate(type)
      .then((data) => {
        if (!alive) return;
        setTemplate(data);
        setAnswers(
          (data.items || []).map((it) => ({
            itemId: it.itemId,
            checked: false,
            memo: "",
          }))
        );
      })
      .catch((e) => alive && setError(e.message || "불러오기 실패"))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [type]);

  const toggle = (itemId) => {
    setAnswers((prev) =>
      prev.map((a) => (a.itemId === itemId ? { ...a, checked: !a.checked } : a))
    );
  };

  const setMemo = (itemId, memo) => {
    setAnswers((prev) =>
      prev.map((a) => (a.itemId === itemId ? { ...a, memo } : a))
    );
  };

  if (loading) return <div style={{ padding: 16 }}>로딩중...</div>;
  if (error) return <div style={{ padding: 16, color: "crimson" }}>에러: {error}</div>;
  if (!template) return <div style={{ padding: 16 }}>템플릿 없음</div>;

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => navigate("/checklist")}>← 목록으로</button>

      <h2 style={{ marginTop: 12 }}>{template.templateName}</h2>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>{template.description}</div>

      <div style={{ display: "grid", gap: 12 }}>
        {(template.items || []).map((it) => {
          const a = answers.find((x) => x.itemId === it.itemId);
          return (
            <div
              key={it.itemId}
              style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}
            >
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={!!a?.checked}
                  onChange={() => toggle(it.itemId)}
                />
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {it.order}. {it.title}
                  </div>
                  {it.description && (
                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {it.description}
                    </div>
                  )}
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                    필수: {it.requiredYn} · 위험도: {it.riskLevel}
                  </div>
                </div>
              </label>

              <textarea
                placeholder="메모(선택)"
                value={a?.memo ?? ""}
                onChange={(e) => setMemo(it.itemId, e.target.value)}
                style={{ width: "100%", marginTop: 10, minHeight: 60 }}
              />
            </div>
          );
        })}
      </div>

      <button
        style={{ marginTop: 16, padding: "10px 14px" }}
        onClick={() => alert("다음 단계: 제출 API 붙이기")}
      >
        제출하기
      </button>
    </div>
  );
}
