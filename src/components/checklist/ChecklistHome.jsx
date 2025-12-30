import { useNavigate } from "react-router-dom";

export default function ChecklistHome() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <h1>체크리스트</h1>
      <p style={{ opacity: 0.7 }}>현재 상황에 맞는 체크리스트를 선택하세요.</p>

      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <button
          onClick={() => navigate("/checklist/pre")}
          style={{ padding: 14, borderRadius: 12, border: "1px solid #ddd" }}
        >
          사전 체크리스트 (계약 전)
        </button>

        <button
          onClick={() => navigate("/checklist/post")}
          style={{ padding: 14, borderRadius: 12, border: "1px solid #ddd" }}
          disabled
          title="사후 체크리스트는 나중에 구현"
        >
          사후 체크리스트 (계약 후)
        </button>
      </div>
    </div>
  );
}
