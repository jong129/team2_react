import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Document from './components/document/Document';
import Member_Login from './components/member/member_login';
import Member_Membership from './components/member/member_membership';
import RagChat from './components/aichatbot/RagChat';
import AiBotPage from "./components/aichatbot/AiBotPage";
import MiniChatbot from "./components/aichatbot/MiniChatbot";
import { useEffect, useState } from "react"; 

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('loginMemberId');
  });

  // 로그인/로그아웃 시 localStorage가 바뀌면 반영되게(간단 버전)
  useEffect(() => {
    const onStorage = () => setIsLoggedIn(!!localStorage.getItem('loginMemberId'));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <BrowserRouter>
      <div style={{ width: '100%' }}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path="/document" element={<Document />} />
          <Route path='/login' element={<Member_Login />} />
          <Route path="/member_membership" element={<Member_Membership />} />
          <Route path="/chat" element={<RagChat />} />
          <Route path="/aibot" element={<AiBotPage />} />
        </Routes>

        {/* ✅ 어디 페이지든 항상 떠있는 미니 챗봇 */}
        <MiniChatbot isLoggedIn={isLoggedIn} />
      </div>
    </BrowserRouter>
  )
}

export default App
