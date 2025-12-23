const RagReferences = ({ references }) => {
  return (
    <div style={{ marginTop: "30px" }}>
      <h3>📌 참고 문서</h3>

      {references.map((ref, idx) => (
        <div
          key={idx}
          style={{
            border: "1px solid #ddd",
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "5px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#555" }}>
            유사도: {(ref.similarityScore * 100).toFixed(1)}%
          </div>

          <div style={{ marginTop: "5px" }}>
            {ref.chunkText.length > 200
              ? ref.chunkText.substring(0, 200) + "..."
              : ref.chunkText}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RagReferences;
