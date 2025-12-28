import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Home from './components/Home'
<<<<<<< HEAD
import ChecklistHome from './components/checklist/ChecklistHome';
import ChecklistRun from './components/checklist/ChecklistRun';
=======
<<<<<<< HEAD
import Member_Login from './components/member/member_login';
import Member_Membership from './components/member/member_membership';
import RagChat from './components/RagChat';
import Member_FindId from './components/member/member_findid';

=======
import Document from './components/document';
import Member_Login from './components/member/member_login';
import Member_Membership from './components/member/member_membership';
import RagChat from './components/aichatbot/RagChat';
import AiBotPage from "./components/aichatbot/AiBotPage";
>>>>>>> ce6b091cf852b2cb63d70855b2ed0fe160e92c7d
>>>>>>> d31ae2b6d17a35dfb645513729d58a6e6ec524ff

function App() {

  return (
    <BrowserRouter>
      <div style={{width: '100%'}}>
        <Routes>
          <Route path='/' element={<Home />} />
<<<<<<< HEAD

          <Route path='/checklist' element={<ChecklistHome />} />
          <Route path='/checklist/run' element={<ChecklistRun />} />

=======
<<<<<<< HEAD
          <Route path='/login' element={<Member_Login />} />
          <Route path="/member_membership" element={<Member_Membership />} />
          {/* ✅ RAG 전용 챗 페이지 */}
          <Route path="/chat" element={<RagChat />} />
          <Route path="/member_findid" element={<Member_FindId />} />
>>>>>>> d31ae2b6d17a35dfb645513729d58a6e6ec524ff
        </Routes>

=======
          <Route path="/document" element={<Document />} />
          <Route path='/login' element={<Member_Login />} />
          <Route path="/member_membership" element={<Member_Membership />} />

          {/* ✅ RAG 전용 챗 페이지 */}
          <Route path="/chat" element={<RagChat />} />
          <Route path="/aibot" element={<AiBotPage />} />
        </Routes>   
>>>>>>> ce6b091cf852b2cb63d70855b2ed0fe160e92c7d
      </div>
    </BrowserRouter>


  )
}

export default App