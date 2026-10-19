import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LessonCatalogProvider } from './features/lessons/LessonCatalogContext';
import { Home, SimplePractice } from './features/simple/SimpleTutor';
import './features/simple/simple-tutor.css';


export default function App() {
  return <LessonCatalogProvider><BrowserRouter><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/practice" element={<SimplePractice />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></LessonCatalogProvider>;
}
