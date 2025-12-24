import React, { useState } from "react";

const RagReferences = ({ refs = [] }) => {
  const [open, setOpen] = useState(false);

  // refs: [{chunkId, chunkText, similarityScore, fileId?...}]
  return (
    <div className="mb-3">
      <button
        className="btn btn-sm btn-outline-secondary rounded-pill"
        onClick={() => setOpen(v => !v)}
      >
        {open ? "출처 닫기" : `출처 보기 (${refs.length})`}
      </button>

      {open && (
        <div className="mt-2">
          {refs.map((r, idx) => (
            <div key={r.chunkId ?? idx} className="p-3 bg-white rounded-4 shadow-sm mb-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold">Chunk #{r.chunkId}</div>
                <div className="text-muted small">
                  유사도: {(r.similarityScore ?? 0).toFixed(4)}
                </div>
              </div>

              <div className="text-secondary small" style={{ whiteSpace: "pre-wrap" }}>
                {r.chunkText}
              </div>

              {r.fileId && (
                <div className="text-muted small mt-2">
                  fileId: {r.fileId}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RagReferences;
