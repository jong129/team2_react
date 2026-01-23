// src/components/aichatbot/MiniChatBot.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  MessageSquareText,
  X,
  ArrowRight,
  MessageCircle,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  Copy,
  Bug,
} from "lucide-react";
import { axiosInstance, getSseBaseUrl } from "../Tool";
import "./MiniChatBot.css";

// 핵심 기능 : 
// 플로팅 버튼(우하단)으로 챗봇 열고 닫기
// 열리면 최근 세션 목록 드롭다운 + 새 대화(세션 생성) + 세션 삭제
// 메시지 영역에서
//    유저/AI 말풍선 렌더링
//    AI 답변 끝나면 액션(좋/싫/재생성/복사) 노출
//    AI 답변 끝나면 추천 질문 3개 노출
//    디버그 토글(Bug 아이콘) 켜면 모델/토큰/지연시간 표시
// 질문 전송은 SSE(EventSource) 스트리밍으로 받고,
//    받은 텍스트를 타이핑 큐로 천천히 출력(12ms)

const DEFAULT_MESSAGES = [  // 최초 화면에 AI 인사 + 추천질문 3개를 기본으로 넣어둠
  {
    role: "ai",
    content: "안녕하세요! 부동산 계약과 관련된 궁금증을 도와드리는 AI 비서입니다.",
    followUpQuestions: [
      "내 상황을 설명하면 어떤 점을 조심해야 하는지 알려줄 수 있어?",
      "전세계약할 때 사람들이 가장 많이 놓치는 위험한 포인트는 뭐야?",
      "안전하게 계약하려면 어떤 정보나 문서를 준비하면 좋아?",
    ],
    showExtras: true, // 추천 질문이 바로 보일 수 있음
    isStreaming: false,
    chatId: null,
    usage: null,
  },
];

// 서버에서 role이 assistant,ai,user 등 섞여와도 프론트에서 "user"/"ai" 두가지만 쓰게 통일
const normalizeRole = (role) => {
  if (!role) return "ai";
  const r = String(role).toLowerCase();
  if (r === "user") return "user";
  if (r === "assistant" || r === "ai") return "ai";
  return "ai";
};

// 서버가 tokens_in/tokensIn처럼 스네이크/카멜 섞어서 보내도 통일해서 변환
const normalizeUsage = (u) => {
  if (!u) return null;
  const model = u.model ?? u.MODEL ?? null;
  const tokensIn = u.tokensIn ?? u.tokens_in ?? null;
  const tokensOut = u.tokensOut ?? u.tokens_out ?? null;
  const tokensTotal = u.tokensTotal ?? u.tokens_total ?? (tokensIn != null && tokensOut != null ? (tokensIn + tokensOut) : null);
  const latencyMs = u.latencyMs ?? u.latency_ms ?? null;
  // 아무 값도 없으면 null로 처리
  if (model == null && tokensIn == null && tokensOut == null && tokensTotal == null && latencyMs == null) return null;

  return { model, tokensIn, tokensOut, tokensTotal, latencyMs };
};

// 서버에서 가져온 메시지를 UI가 쓰기 좋은 형태로 전처리
const normalizeMessages = (serverMessages) => {
  if (!Array.isArray(serverMessages)) return [];
  return serverMessages.map((m) => ({
    role: normalizeRole(m.role),
    content: m.content ?? "",
    references: m.references ?? [],
    followUpQuestions: Array.isArray(m.followUpQuestions) ? m.followUpQuestions : [],
    chatId: m.chatId ?? m.id ?? m.chat_id ?? null,
    likeCount: m.likeCount ?? 0,
    dislikeCount: m.dislikeCount ?? 0,
    myFeedback: m.myFeedback ?? null,
    usage: normalizeUsage(m.usage) ?? null,
    isStreaming: false,
    showExtras: true,
  }));
};

// 백엔드가 날짜별 그룹 형태로 세션을 주는 DTO를 최근 목록 드롭다운에 쓰기 위해 flat array로 펴는 함수
const flattenGroupedSessions = (data) => {
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const g of data) {
    const sessions = Array.isArray(g.sessions)
      ? g.sessions
      : Array.isArray(g.items)
        ? g.items
        : [];
    for (const s of sessions) out.push(s);
  }
  return out;
};

export default function MiniChatbot({ isLoggedIn }) {
  // 상태 (state)
  const [isChatOpen, setIsChatOpen] = useState(false);  // 창 열림/닫힘
  const [sessionId, setSessionId] = useState(null);   // 현재 세션
  const [recentSessions, setRecentSessions] = useState([]);  // 세션 드롭다운 데이터 
  const [loadingSessions, setLoadingSessions] = useState(false);  // 로딩 상태
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);   // 화면에 보여줄 메시지 배열
  const [input, setInput] = useState("");   // 입력창 값
  const [loading, setLoading] = useState(false);  // 질문 보내고 답 기다리는 중인지(버튼/입력 비활성화 등)
  const [showDebug, setShowDebug] = useState(false);  // 디버그(토큰/지연) 표시 토글

  // 렌더링과 무관한 상태를 안정적으로 유지 (ref)
  const bottomRef = useRef(null); // 새 메시지 오면 스크롤 맨 아래로 이동
  const streamRef = useRef(null); // 현재 EventSource(SSE 연결)를 저장 (닫을 때 필요)
  const typingQueueRef = useRef("");  // 스트리밍으로 받은 텍스트를 누적하는 큐 (문자열)
  const typingRunningRef = useRef(false); // 타이핑 루프가 이미 돌고 있는지 (중복 실행 방지)
  const pendingFinalizeRef = useRef(null); // done 이벤트가 먼저 와도 타이핑이 다 끝난뒤 마무리 하게하는 플래그

  const makeTempId = () => {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  // 스트림 종료/정리 : 챗 닫을 때/세션 바꿀 때/새 질문 보내기 전 기존 SSE 연결을 안전하게 끊고
  //                   타이핑 큐/상태를 초기화해서 이전 답변이 새 답변에 섞이는 버그를 방지
  const closeStream = () => {
    if (streamRef.current) {
      try {
        streamRef.current.close();
      } catch (err) {
        console.warn("SSE close failed (ignored):", err);
      }
      streamRef.current = null;
    }
    typingQueueRef.current = "";
    typingRunningRef.current = false;
    pendingFinalizeRef.current = null;
  };

  // 자동 스크롤 : 메시지/로딩 상태가 바뀌면 아래로 스크롤
  useEffect(() => {
    if (!isChatOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isChatOpen]);

  // 컴포넌트 unmount시 스트림 닫기 : 화면에서 컴포넌트가 사라질 때도 연결이 남지 않게 cleanup
  useEffect(() => { return () => closeStream(); }, []);

  // -----------------------------
  // API helpers
  // -----------------------------
  // /api/chat/sessions/grouped GET : grouped -> flat 변환후 최대 15개만 유지
  const loadRecentSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await axiosInstance.get("/api/chat/sessions/grouped");
      const flat = flattenGroupedSessions(res.data);
      setRecentSessions(flat.slice(0, 15));
    } catch (e) {
      console.warn("최근 세션 목록 로드 실패(미니챗):", e);
      setRecentSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  // /api/chat/sessions/{sid}/messages?limit=50 GET : normalizeMessages로 변환해 messages에 반영
  const loadMessagesBySession = async (sid) => {
    const mres = await axiosInstance.get(`/api/chat/sessions/${sid}/messages`, {
      params: { limit: 50 },
    });
    const loaded = normalizeMessages(mres.data.messages);
    setMessages(loaded.length > 0 ? loaded : DEFAULT_MESSAGES);
  };

  // /api/chat/sessions/latest POST : sessionId 확보
  const ensureLatestSession = async () => {
    const sres = await axiosInstance.post("/api/chat/sessions/latest");
    const sid = sres.data.sessionId;
    setSessionId(sid);
    return sid;
  };

  // SSE meta로 세션 제목이 바뀌어 오면 드롭다운 목록에 즉시 반영. 새 세션이 목록에 없으면 맨 앞에 추가
  const applySessionTitle = (sid, newTitle) => {
    if (!sid || !newTitle) return;

    const title = String(newTitle).trim();
    if (!title) return;

    setRecentSessions((prev) => {
      const next = prev.map((s) => {
        const id = s.sessionId ?? s.id;
        return String(id) === String(sid) ? { ...s, title } : s;
      });

      const exists = next.some((s) => String(s.sessionId ?? s.id) === String(sid));
      if (!exists) return [{ sessionId: sid, title }, ...next].slice(0, 15);

      return next;
    });
  };

  // 백엔드마다 엔드포인트가 다를 수 있으니 후보 3개를 순회하며 시도
  const createNewSession = async () => {
    try {
      const candidates = [
        { method: "post", url: "/api/chat/sessions" },
        { method: "post", url: "/api/chat/sessions/new" },
        { method: "post", url: "/api/chat/sessions/create" },
      ];
      // 성공하면 스트림 닫고 sessionId 세팅. messages를 DEFAULT로 초기화. recentSessions 다시 로드
      for (const c of candidates) {
        try {
          const res = await axiosInstance[c.method](c.url, {});
          const sid = res?.data?.sessionId ?? res?.data?.id;
          if (sid != null) {
            closeStream();
            setSessionId(sid);
            setMessages(DEFAULT_MESSAGES);
            await loadRecentSessions();
            return sid;
          }
        } catch (err) {
          console.warn(`[세션 생성 실패] ${c.method.toUpperCase()} ${c.url}`, err);
        }
      }

      closeStream();
      setSessionId(null);
      setMessages(DEFAULT_MESSAGES);
      alert(
        "⚠️ 서버에 '새 세션 생성 API'가 없어 화면만 새 대화로 초기화했습니다.\n(백엔드에 세션 생성 엔드포인트 추가 시 완전 지원 가능)"
      );
      return null;
    } catch (e) {
      console.error("새 세션 생성 실패:", e);
      alert("새 대화 시작에 실패했습니다. (서버 로그 확인)");
      return null;
    }
  };

  // confirm 받고 /api/chat/sessions/{sessionId} DELETE. 삭제 후 최신 세션 다시 확보 + 메시지 로드 + 최근 세션 갱신
  const deleteCurrentSession = async () => {
    if (!sessionId) {
      setMessages(DEFAULT_MESSAGES);
      return;
    }

    const ok = window.confirm(`현재 대화(세션 #${sessionId})를 삭제할까요?`);
    if (!ok) return;

    try {
      closeStream();
      await axiosInstance.delete(`/api/chat/sessions/${sessionId}`);

      const sid = await ensureLatestSession();
      await loadMessagesBySession(sid);
      await loadRecentSessions();
    } catch (e) {
      console.error("세션 삭제 실패:", e);
      alert("삭제에 실패했습니다. (권한/서버 로그 확인)");
    }
  };

  // HTTPS/권한 있으면 navigator.clipboard.writeText, 안되면 textarea + execCommand("copy") fallback
  const copyText = async (text) => {
    try {
      if (navigator?.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        alert("복사되었습니다!");
        return;
      }

      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();

      const ok = document.execCommand("copy");
      document.body.removeChild(ta);

      if (!ok) throw new Error("execCommand copy failed");
      alert("복사되었습니다!");
    } catch (err) {
      console.error("복사 실패:", err);
      alert("복사에 실패했습니다. (브라우저 권한/HTTPS 환경을 확인하세요)");
    }
  };

  // /api/chat/messages/{chatId}/feedback POST : 응답의 like/dislike/myFeedback을 해당 메시지에 반영
  const sendFeedback = async (chatId, liked) => {
    const res = await axiosInstance.post(`/api/chat/messages/${chatId}/feedback`, { liked });
    const { likeCount, dislikeCount, myFeedback } = res.data;

    setMessages((prev) =>
      prev.map((m) => (m.chatId === chatId ? { ...m, likeCount, dislikeCount, myFeedback } : m))
    );
  };

  // -----------------------------
  // 스트리밍(타이핑 효과) 유틸
  // -----------------------------
  // 타이핑 큐가 비었고, 타이핑 실행중이 아닐 때만 해당 AI 메시지를 isStreaming:false, showExtras:true로 바꿈
  const finalizeIfReady = (aiTempId) => {
    if (typingQueueRef.current.length > 0 || typingRunningRef.current) return;

    setMessages((prev) =>
      prev.map((m) =>
        m._tempId === aiTempId ? { ...m, isStreaming: false, showExtras: true } : m
      )
    );
    // pendingFinalizeRef : SSE의 done 이벤트가 오면 finalize를 예약해두고 타이핑 끝났을 때 finalize 수행
    pendingFinalizeRef.current = null;
    setLoading(false);  // 로딩 false로 바꿈
  };

  // typingRunningRef로 동시에 두번 실행 방지. 큐에서 글자 1개씩 꺼내 메시지 content에 붙임
  const pumpTyping = async (aiTempId) => {
    if (typingRunningRef.current) return;
    typingRunningRef.current = true;

    try {
      while (typingQueueRef.current.length > 0) {
        const ch = typingQueueRef.current[0];
        typingQueueRef.current = typingQueueRef.current.slice(1);

        setMessages((prev) =>
          prev.map((m) => (m._tempId === aiTempId ? { ...m, content: (m.content ?? "") + ch } : m))
        );

        await new Promise((r) => setTimeout(r, 12));  // 타이핑 속도 조절
      }
    } finally {
      typingRunningRef.current = false;

      if (pendingFinalizeRef.current?.aiTempId === aiTempId) {
        finalizeIfReady(aiTempId);
      }
    }
  };

  // -----------------------------
  // regenerate (다시 작성)
  // -----------------------------
  // regenerate()는 SSE가 아니라 기존 동기 API(/api/rag/ask)를 그대로 씀
  const regenerate = async () => {
    if (loading) return;

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    setLoading(true);
    try {
      const res = await axiosInstance.post("/api/rag/ask", {
        sessionId,
        question: lastUser.content,
        regenerate: true,
        docId: localStorage.getItem("currentDocId"),
        docType: localStorage.getItem("currentDocType"),
        stage: "document",
        topK: 5,
      });

      applySessionTitle(sessionId, res.data.sessionTitle);

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: res.data.answer ?? "(답변이 비어있습니다)",
          chatId: res.data.assistantChatId,
          likeCount: 0,
          dislikeCount: 0,
          myFeedback: null,
          references: res.data.references ?? [],
          followUpQuestions: res.data.followUpQuestions ?? [],
          usage: normalizeUsage(res.data.usage) ?? null, // ✅ 추가
          isStreaming: false,
          showExtras: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // open/toggle
  // -----------------------------
  const openChatAndLoad = async () => {
    try {
      await loadRecentSessions();
      const sid = await ensureLatestSession();
      await loadMessagesBySession(sid);
    } catch (err) {
      console.error("세션/기록 로드 실패:", err);
      setMessages([
        {
          role: "ai",
          content: "⚠️ 이전 대화를 불러오지 못했습니다. 새로 대화를 시작할 수 있어요.",
          showExtras: true,
          isStreaming: false,
        },
      ]);
    }
  };

  const toggleChat = async () => {
    if (!isLoggedIn) {
      alert("AI 비서 기능은 로그인이 필요합니다.");
      return;
    }

    if (isChatOpen) {
      closeStream();
      setLoading(false);
      setIsChatOpen(false);
      return;
    }

    setIsChatOpen(true);
    await openChatAndLoad();
  };

  // Home 'open-mini-chat' 이벤트 : 기록 로드, detail.question이 있으면 자동 입력/자동 전송
  useEffect(() => {
    const handler = async (e) => {
      if (!isLoggedIn) {
        alert("AI 비서 기능은 로그인이 필요합니다.");
        return;
      }

      const detail = e?.detail || {};
      setIsChatOpen(true);

      await openChatAndLoad();

      if (detail.question) {
        if (detail.autoSend) {
          await submitQuestion(detail.question);
        } else {
          setInput(detail.question);
        }
      }
    };

    window.addEventListener("open-mini-chat", handler);
    return () => window.removeEventListener("open-mini-chat", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // -----------------------------
  // 질문 보내기 (SSE) 중요!!!
  // -----------------------------
  const submitQuestion = async (text, { appendUser = true } = {}) => {
    // 1. 입력 검증 : 공백이면 return. loading이면 return(중복 전송 방지)
    const q = String(text ?? "").trim();
    if (!q || loading) return;

    // 2. 세션 확보 : sessionId 없으면 /api/chat/sessions/latest로 확보
    let sid = sessionId;
    if (!sid) {
      const sres = await axiosInstance.post("/api/chat/sessions/latest");
      sid = sres.data.sessionId;
      setSessionId(sid);
    }

    // 3. 기존 스트림 정리 : closeStream() 호출해서 이전 SSE/큐 정리
    closeStream();

    // 4. 사용자 메시지 추가(옵션) : appendUser=true면 messages에 user 말풍선 추가
    if (appendUser) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: q, showExtras: false, isStreaming: false },
      ]);
    }

    // 5. 임시 AI 메시지 먼저 추가
    const aiTempId = makeTempId();  // aiTempId를 만들어서 메시지에 _tempId로 박아둠

    setMessages((prev) => [ // content는 빈 문자열, isStreaming:true, showExtras:false
      ...prev,
      {
        role: "ai",
        content: "",
        references: [],
        followUpQuestions: [],
        chatId: null,
        likeCount: 0,
        dislikeCount: 0,
        myFeedback: null,
        usage: null,
        _tempId: aiTempId,
        isStreaming: true,
        showExtras: false,
      },
    ]);

    setLoading(true);

    try {
      // 6. 스트리밍 시작 API 호출
      const startRes = await axiosInstance.post("/api/rag/ask/start", {
        sessionId: sid,
        question: q,
        docId: localStorage.getItem("currentDocId"),
        docType: localStorage.getItem("currentDocType"),
        stage: "document",
        topK: 5,
      });
      const jobId = startRes.data.jobId;  // jobId 반환

      // 7. SSE 연결
      const es = new EventSource(
        `${getSseBaseUrl()}/api/rag/ask/stream?jobId=${encodeURIComponent(jobId)}`,
        { withCredentials: true }
      );
      streamRef.current = es;

      // 8. 이벤트 처리 4종류
      // 기본 onmessage
      es.onmessage = (e) => {
        typingQueueRef.current += e.data ?? ""; // e.data는 답변 텍스트 조각
        pumpTyping(aiTempId);
      };

      // meta 이벤트 : references / followUpQuestions / chatId / (optional) usage / sessionTitle
      es.addEventListener("meta", (e) => {
        let meta = null;
        try {
          meta = JSON.parse(e.data);
        } catch {
          meta = null;
        }
        if (!meta) return;

        applySessionTitle(sid, meta.sessionTitle);

        // 해당 _tempId 메시지에만 메타를 주입
        setMessages((prev) =>
          prev.map((m) => {
            if (m._tempId !== aiTempId) return m;
            return {
              ...m,
              references: meta.references ?? m.references ?? [],
              followUpQuestions: meta.followUpQuestions ?? m.followUpQuestions ?? [],
              chatId: meta.assistantChatId ?? meta.chatId ?? m.chatId ?? null,
              usage: normalizeUsage(meta.usage) ?? m.usage ?? null,
            };
          })
        );
      });

      // done 이벤트
      es.addEventListener("done", () => {
        es.close(); // 스트림 닫기
        if (streamRef.current === es) streamRef.current = null;

        pendingFinalizeRef.current = { aiTempId };  // pendingFinalizeRef 설정
        finalizeIfReady(aiTempId);  // finalizeIfReady 호출 (큐가 비었으면 즉시 extras 표시)
      });

      // error 이벤트
      es.addEventListener("error", () => {
        es.close();
        if (streamRef.current === es) streamRef.current = null;

        setMessages((prev) =>
          prev.map((m) =>
            m._tempId === aiTempId
              ? {
                ...m,
                isStreaming: false,
                showExtras: true,
                content: (m.content ?? "") + "\n\n⚠️ 스트리밍 중 오류",
              }
              : m
          )
        );
        setLoading(false);  // loading false
      });
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "⚠️ 답변 생성 중 오류가 발생했습니다.",
          showExtras: true,
          isStreaming: false,
        },
      ]);
      setLoading(false);
    }
  };

  // isThinking 표시 : AI 스트리밍 메시지가 존재하지만 아직 글자가 0개일 때만 표시. 렌더에서 빈 스트리밍 말풍선은 숨김 처리   
  const isThinking = messages.some(
    (m) => m.role === "ai" && m.isStreaming && (!m.content || m.content.length === 0)
  );

  const askAi = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    await submitQuestion(q);
  };

  const changeSession = async (sid) => {
    if (!sid) return;
    try {
      closeStream();
      setLoading(false);

      setSessionId(sid);
      setMessages([{ role: "ai", content: "불러오는 중...", showExtras: false, isStreaming: false }]);
      await loadMessagesBySession(sid);
    } catch (e) {
      console.error("세션 전환 실패:", e);
      setMessages([{ role: "ai", content: "⚠️ 대화를 불러오지 못했습니다.", showExtras: true, isStreaming: false }]);
    }
  };

  const renderUsageLine = (u) => {
    const usage = normalizeUsage(u);
    if (!usage) return null;

    const model = usage.model ?? "-";
    const total = usage.tokensTotal ?? "-";
    const inOut =
      usage.tokensIn != null && usage.tokensOut != null
        ? ` (in ${usage.tokensIn} / out ${usage.tokensOut})`
        : "";
    const lat = usage.latencyMs != null ? `${usage.latencyMs}ms` : "-";

    return (
      <div className="text-muted small" style={{ marginTop: 4 }}>
        모델: <span className="font-monospace">{model}</span>
        {" · "}
        토큰: <span className="font-monospace">{total}</span>
        {inOut}
        {" · "}
        지연: <span className="font-monospace">{lat}</span>
      </div>
    );
  };

  return (
    <>
      {/* Floating Button */}
      <div className="mini-chat-fab-wrap">
        <button
          onClick={toggleChat}
          className={`mini-chat-fab ${isChatOpen ? "is-open" : ""}`}
          aria-label="mini chat toggle"
        >
          {isChatOpen ? <X size={32} color="white" /> : <MessageCircle size={32} color="white" />}
        </button>
      </div>

      {/* Mini Chat Window */}
      {isChatOpen && (
        <div className="mini-chat-window">
          {/* Header */}
          <div className="mini-chat-header">
            <div className="mini-chat-header-row">
              <div className="mini-chat-title">
                <MessageSquareText size={20} />
                <span className="mini-chat-title-text" title="홈스캐너 AI 비서">
                  홈스캐너 AI 비서
                </span>
              </div>

              <div className="mini-chat-header-actions">
                <button
                  className={`btn btn-sm ${showDebug ? "btn-dark" : "btn-light"} mini-chat-icon-btn`}
                  onClick={() => setShowDebug((v) => !v)}
                  title="디버그(토큰/지연) 표시"
                >
                  <Bug size={16} />
                </button>

                <button
                  onClick={() => {
                    closeStream();
                    setLoading(false);
                    setIsChatOpen(false);
                  }}
                  className="mini-chat-close-btn"
                  title="닫기"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="mini-chat-session-row">
              <select
                className="form-select form-select-sm mini-chat-session-select"
                value={sessionId ?? ""}
                onChange={(e) => changeSession(Number(e.target.value))}
                disabled={loadingSessions}
              >
                <option value="" disabled>
                  {loadingSessions ? "불러오는 중..." : "세션 선택"}
                </option>
                {recentSessions.map((s) => {
                  const sid = s.sessionId ?? s.id;
                  const title = s.title || `세션 #${sid}`;
                  return (
                    <option key={sid} value={sid}>
                      {title}
                    </option>
                  );
                })}
              </select>

              <button
                className="btn btn-sm btn-light mini-chat-session-btn"
                onClick={createNewSession}
                disabled={loading}
                title="새 대화"
              >
                <Plus size={16} />
              </button>

              <button
                className="btn btn-sm btn-light mini-chat-session-btn"
                onClick={deleteCurrentSession}
                disabled={loading}
                title="현재 대화 삭제"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="mini-chat-body">
            {/* 메시지 리스트 */}
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isAi = msg.role === "ai";

              // 빈 스트리밍 AI 말풍선 숨기기
              if (isAi && msg.isStreaming && (!msg.content || msg.content.length === 0)) return null;

              return (
                <div key={idx} className={`msg-row ${isUser ? "user" : "ai"}`}>
                  <div className={`msg-bubble ${isUser ? "user" : "ai"}`}>
                    {msg.content}
                  </div>

                  {/* AI 답변 액션: 스트리밍 끝난 뒤에만 */}
                  {isAi && msg.showExtras && !msg.isStreaming && msg.chatId && (
                    <div style={{ maxWidth: "85%" }}>
                      <div className="msg-actions">
                        <button
                          type="button"
                          className={`action-icon ${msg.myFeedback === 1 ? "active like" : ""}`}
                          onClick={() => sendFeedback(msg.chatId, true)}
                          title="좋아요"
                          aria-label="좋아요"
                        >
                          <ThumbsUp size={18} />
                        </button>

                        <button
                          type="button"
                          className={`action-icon ${msg.myFeedback === -1 ? "active dislike" : ""}`}
                          onClick={() => sendFeedback(msg.chatId, false)}
                          title="싫어요"
                          aria-label="싫어요"
                        >
                          <ThumbsDown size={18} />
                        </button>

                        <button
                          type="button"
                          className="action-icon"
                          onClick={regenerate}
                          title="다시작성"
                          aria-label="다시작성"
                          disabled={loading}
                        >
                          <RefreshCcw size={18} />
                        </button>

                        <button
                          type="button"
                          className="action-icon"
                          onClick={() => copyText(msg.content)}
                          title="복사"
                          aria-label="복사"
                        >
                          <Copy size={18} />
                        </button>
                      </div>

                      {/* 디버그(토큰/지연) 표시: DBG 토글 ON일 때만 */}
                      {showDebug && renderUsageLine(msg.usage)}
                    </div>
                  )}

                  {/* 추천 질문: 스트리밍 끝난 뒤에만 */}
                  {isAi &&
                    msg.showExtras &&
                    !msg.isStreaming &&
                    Array.isArray(msg.followUpQuestions) &&
                    msg.followUpQuestions.length > 0 && (
                      <div className="fu-wrap">
                        <div className="fu-label">
                          <span className="fu-badge">추천 질문</span>
                        </div>

                        {msg.followUpQuestions.slice(0, 3).map((q, i) => (
                          <button
                            key={i}
                            type="button"
                            className="fu-chip"
                            onClick={() => submitQuestion(q)}
                            disabled={loading}
                            title="추천 질문으로 이어서 묻기"
                          >
                            <span className="fu-dot" />
                            <span className="fu-text">{q}</span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}

            {/* “생각 중”은 ‘스트리밍 중 + 아직 글자 0개’일 때만 */}
            {isThinking && (
              <div className="mini-chat-thinking">
                AI가 답변을 생성 중입니다...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Footer */}
          <div className="mini-chat-footer">
            <div className="input-group">
              <input
                type="text"
                className="form-control mini-chat-input"
                placeholder="메시지를 입력하세요..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) askAi();
                }}
                disabled={loading}
              />
              <button className="btn mini-chat-send" onClick={askAi} disabled={loading}>
                <ArrowRight size={18} color="white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
