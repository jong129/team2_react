import { useState } from 'react'
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import { getCopyright } from './components/Tool';
import Home from './components/Home'
import Member_Login from './components/member/member_login';
import Member_Membership from './components/member/member_membership';

function App() {

  return (
    <BrowserRouter>
      <div style={{width: '100%'}}>
        2조 React Frontend project
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<Member_Login />} />
          <Route path="/member_membership" element={<Member_Membership />} />
        </Routes>

        <div className='copyright'>{getCopyright()}</div>      
      </div>
    </BrowserRouter>


  )
}

export default App