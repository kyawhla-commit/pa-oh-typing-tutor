import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LessonCatalogProvider } from './features/lessons/LessonCatalogContext';
import { Home, SimplePractice } from './features/simple/SimpleTutor';
import './features/simple/simple-tutor.css';


export default function App() {
  // A packaged webview serves local assets; hash routes survive reloads there.
  const Router = import.meta.env.MODE === 'desktop' ? HashRouter : BrowserRouter;
  return <LessonCatalogProvider><Router><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/practice" element={<SimplePractice />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Router></LessonCatalogProvider>;
}
