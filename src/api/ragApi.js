import axios from "axios";

export const askRag = async (sessionId, question) => {
  const response = await axios.post("/api/rag/ask", {
    sessionId,
    question,
  });
  return response.data;
};
