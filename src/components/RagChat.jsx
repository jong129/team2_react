import { useState } from "react";
import { askRag } from "../api/ragApi";
import RagAnswer from "./RagAnswer";
import RagReferences from "./RagReferences";

const RagChat = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(false);

  const sessionId = 1; // 테스트용 (로그인 연동 시 교체)

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const result = await askRag(sessionId, question);
      setAnswer(result.answer);
      setReferences(result.references || []);
    } catch (e) {
      console.error(e);
      alert("AI 응답 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="질문을 입력하세요"
        rows={4}
        style={{ width: "100%", padding: "10px" }}
      />

      <button onClick={handleAsk} disabled={loading}>
        {loading ? "답변 생성 중..." : "질문하기"}
      </button>

      {answer && <RagAnswer answer={answer} />}
      {references.length > 0 && (
        <RagReferences references={references} />
      )}
    </div>
  );
};

export default RagChat;
