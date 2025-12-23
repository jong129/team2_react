import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Home from './components/Home'
<<<<<<< HEAD
import Member_Login from './components/member/member_login';
import Member_Membership from './components/member/member_membership';
=======
import RagChat from './components/RagChat';
>>>>>>> a37649c374a54c262423847f3c3b9f57ff193b49

function App() {

  return (
    <BrowserRouter>
      <div style={{width: '100%'}}>
        <Routes>
          <Route path='/' element={<Home />} />
<<<<<<< HEAD
          <Route path='/login' element={<Member_Login />} />
          <Route path="/member_membership" element={<Member_Membership />} />
        </Routes>
=======
>>>>>>> a37649c374a54c262423847f3c3b9f57ff193b49

          {/* ✅ RAG 전용 챗 페이지 */}
          <Route path="/chat" element={<RagChat />} />
        </Routes>   
      </div>
    </BrowserRouter>


  )
}

export default App