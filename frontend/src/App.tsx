import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Home, SimplePractice } from './features/simple/SimpleTutor';
import './features/simple/simple-tutor.css';

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/practice" element={<SimplePractice />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
