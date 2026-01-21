import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Document from './components/document/Document';
import ChecklistHome from './components/checklist/ChecklistHome';
import PreChecklistPage from './components/checklist/PreChecklistPage';
import HistoryPage from "./components/checklist/HistoryPage";
import PostChecklistPage from "./components/checklist/PostChecklistPage";
import AdminChecklistManage from "./components/checklist/AdminChecklistManage";
import AdminChecklistTemplatesPage from "./components/checklist/AdminChecklistTemplatesPage";
import AdminChecklistTemplateEditPage from "./components/checklist/AdminChecklistTemplateEditPage";
import AdminPostChecklistAiPanel from "./components/checklist/AdminPostChecklistAiPanel";
import AdminPostChecklistAiImprovePage from './components/checklist/AdminPostChecklistAiImprovePage';
import Member_Login from './components/member/member_login';
import Member_Membership from './components/member/member_membership';
import Member_FindId from './components/member/member_findid';
import MemberChatPage from "./components/aichatbot/MemberChatPage";
import AdminChatPage from './components/aichatbot/AdminChatPage';
import ChatbotStats from './components/aichatbot/ChatbotStats';
import MiniChatbot from "./components/aichatbot/MiniChatBot";
import Member_FindPw from './components/member/member_findpw';
import Member_ChangePw from './components/member/member_changepw';
import { useEffect, useState } from "react";
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLoginHistory from './components/admin/AdminLoginHistory';
import AdminUserList from './components/admin/AdminUserList';
import Member_Mypage from './components/member/member_mymage';
import Member_Mypage_Update from './components/member/member_mypage_update';
import AdminActivityHistory from './components/admin/AdminActivityHistory';
import AdminWithDrawHistory from './components/admin/AdminWithDrawHistory';
import AdminChangePwHistory from './components/admin/AdminChangePwHistory';
import AdminUserUpdateHistory from './components/admin/AdminUserUpdateHistory';
import AdminCateGory from './components/admin/AdminCateGory';
import AdminDocuments from './components/admin/AdminDocuments';
import Board from './components/board/Board';
import BoardWrite from './components/board/BoardWrite';
import BoardEdit from './components/board/BoardEdit';
import BoardRead from './components/board/BoardRead';
import Member_Inquiries from './components/member/member_inquiries';
import Admin_inquiries_reply from './components/admin/Admin_inquiries_reply';


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('loginMemberId');
  });

  useEffect(() => {
    const sync = () => setIsLoggedIn(!!localStorage.getItem("loginMemberId"));

    // 처음 1회 동기화
    sync();

    // 같은 탭에서도 동작하게 커스텀 이벤트 사용
    window.addEventListener("auth-change", sync);

    return () => window.removeEventListener("auth-change", sync);
  }, []);

  return (
    <BrowserRouter>
      <div style={{ width: '100%' }}>
        <Routes>
          <Route path='/' element={<Home isLoggedIn={isLoggedIn} />} />
          <Route path='/checklist' element={<ChecklistHome />} />
          <Route path='/checklist/pre' element={<PreChecklistPage />} />
          <Route path="/checklist/history" element={<HistoryPage />} />
          <Route path="/checklist/post" element={<PostChecklistPage />} />
          <Route path="/admin/checklist" element={<AdminChecklistManage />} />
          <Route path="/admin/checklists/templates" element={<AdminChecklistTemplatesPage />} />
          <Route path="/admin/checklists/templates/:templateId/edit" element={<AdminChecklistTemplateEditPage />} />
          <Route path="/admin/ai/post" element={<AdminPostChecklistAiPanel />} />
          <Route path="/admin/ai/post/improve/:templateId" element={<AdminPostChecklistAiImprovePage />} />
          <Route path="/document" element={<Document />} />
          <Route path='/login' element={<Member_Login />} />
          <Route path="/member_membership" element={<Member_Membership />} />
          <Route path="/member_findid" element={<Member_FindId />} />
          <Route path="/member_findpw" element={<Member_FindPw />} />
          <Route path="/member_changepw" element={<Member_ChangePw />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/login_history" element={<AdminLoginHistory />} />
          <Route path="/admin/userlist" element={<AdminUserList />} />
          <Route path="/member/mypage" element={<Member_Mypage />} />
          <Route path="/member/mypage/update" element={<Member_Mypage_Update />} />
          <Route path="/admin/activity_history" element={<AdminActivityHistory />} />
          <Route path="/admin/withdraw_history" element={<AdminWithDrawHistory />} />
          <Route path="/admin/change_pw_history" element={<AdminChangePwHistory />} />
          <Route path="/admin/user_update_history" element={<AdminUserUpdateHistory />} />
          <Route path="/admin/categories" element={<AdminCateGory />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/board/*" element={<Board />} />
          <Route path="/board/write" element={<BoardWrite />} />
          <Route path="/board/edit/:boardId" element={<BoardEdit />} />
          <Route path="/board/read/:boardId" element={<BoardRead />} />
          <Route path="/member/inquiries" element={<Member_Inquiries />} />
          <Route path="/admin/inquiries_reply" element={<Admin_inquiries_reply />} />
          {/* RAG 전용 챗 페이지 */}
          <Route path="/aibot" element={<MemberChatPage />} />
          <Route path="/admin/chat" element={<AdminChatPage />} />
          <Route path="/admin/chatbotstats" element={<ChatbotStats />} />
        </Routes>

        {/* 어디 페이지든 항상 떠있는 미니 챗봇 */}
        <MiniChatbot isLoggedIn={isLoggedIn} />
      </div>
    </BrowserRouter>
  )
}

export default App
