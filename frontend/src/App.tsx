import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LessonCatalogProvider } from './features/lessons/LessonCatalogContext';
import { Home, SimplePractice } from './features/simple/SimpleTutor';
import LessonReading from './features/simple/LessonReading';
import './features/simple/simple-tutor.css';
import './features/simple/home-tutor.css';


export default function App() {
  // A packaged webview serves local assets; hash routes survive reloads there.
  const Router = import.meta.env.MODE === 'desktop' ? HashRouter : BrowserRouter;
  return <LessonCatalogProvider><Router><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/practice" element={<SimplePractice />} />
    <Route path="/lessons" element={<LessonReading />} />
    <Route path="/lessons/:lessonId" element={<LessonReading />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Router></LessonCatalogProvider>;
}
