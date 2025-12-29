import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchActiveTemplate } from "./checklistApi";

export default function ChecklistHome() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("PRE");
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(
    () => (tab === "PRE" ? "사전 체크리스트" : "사후 체크리스트"),
    [tab]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setTemplate(null);

    fetchActiveTemplate(tab)
      .then((data) => alive && setTemplate(data))
      .catch((e) => alive && setError(e.message || "불러오기 실패"))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [tab]);

  const onStart = () => {
    // ✅ Run 페이지에서 다시 active 조회할 거라 type만 넘기면 됨
    navigate(`/checklist/run?type=${tab}`);
  };

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>체크리스트</h2>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        {title} 템플릿을 확인하고 시작하세요.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TabButton active={tab === "PRE"} onClick={() => setTab("PRE")}>
          사전(PRE)
        </TabButton>
        <TabButton active={tab === "POST"} onClick={() => setTab("POST")}>
          사후(POST)
        </TabButton>
      </div>

      {loading && <div>로딩중...</div>}
      {error && <div style={{ color: "crimson" }}>에러: {error}</div>}

      {!loading && !error && template && (
        <TemplateCard template={template} onClick={onStart} />
      )}

      {!loading && !error && !template && (
        <div style={{ opacity: 0.7 }}>활성 템플릿이 없습니다.</div>
      )}
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #ddd",
        cursor: "pointer",
        fontWeight: 700,
        background: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
      }}
    >
      {children}
    </button>
  );
}

function TemplateCard({ template, onClick }) {
  const itemsCount = template.items?.length ?? 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 14,
        border: "1px solid #e6e6e6",
        padding: 16,
        cursor: "pointer",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>
          {template.templateName}
        </div>
        <span
          style={{
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #ddd",
            opacity: 0.9,
          }}
        >
          {template.templateType}
        </span>
      </div>

      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
        버전 {template.versionNo} · 항목 {itemsCount}개
      </div>

      {template.description && (
        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
          {template.description}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.9 }}>
        시작하기 →
      </div>
    </button>
  );
}
