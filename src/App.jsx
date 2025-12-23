import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Home from './components/Home'
import RagChat from './components/RagChat';

function App() {

  return (
    <BrowserRouter>
      <div style={{width: '100%'}}>
        <Routes>
          <Route path='/' element={<Home />} />

          {/* ✅ RAG 전용 챗 페이지 */}
          <Route path="/chat" element={<RagChat />} />
        </Routes>   
      </div>
    </BrowserRouter>


  )
}

export default App