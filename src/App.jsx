import { useState } from 'react'
import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import { getCopyright } from './components/Tool';
import Home from './components/Home'
import ChecklistHome from './components/checklist/ChecklistHome';
import ChecklistRun from './components/checklist/ChecklistRun';

function App() {

  return (
    <BrowserRouter>
      <div style={{width: '100%'}}>
        2조 React Frontend project
        <Routes>
          <Route path='/' element={<Home />} />

          <Route path='/checklist' element={<ChecklistHome />} />
          <Route path='/checklist/run' element={<ChecklistRun />} />

        </Routes>

        <div className='copyright'>{getCopyright()}</div>      
      </div>
    </BrowserRouter>


  )
}

export default App