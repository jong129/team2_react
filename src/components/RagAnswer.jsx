const RagAnswer = ({ answer }) => {
  return (
    <div style={{ marginTop: "30px" }}>
      <h3>🤖 AI 답변</h3>
      <div
        style={{
          background: "#f9f9f9",
          padding: "15px",
          borderRadius: "6px",
          whiteSpace: "pre-wrap",
        }}
      >
        {answer}
      </div>
    </div>
  );
};

export default RagAnswer;
