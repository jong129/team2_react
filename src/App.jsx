import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Home from './components/Home'
import Member_Login from './components/member/member_login';
import Member_Membership from './components/member/member_membership';
import RagChat from './components/aichatbot/RagChat';
import AiBotPage from "./components/aichatbot/AiBotPage";

function App() {

  return (
    <BrowserRouter>
      <div style={{width: '100%'}}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<Member_Login />} />
          <Route path="/member_membership" element={<Member_Membership />} />

          {/* ✅ RAG 전용 챗 페이지 */}
          <Route path="/chat" element={<RagChat />} />
          <Route path="/aibot" element={<AiBotPage />} />
        </Routes>   
      </div>
    </BrowserRouter>


  )
}

export default App