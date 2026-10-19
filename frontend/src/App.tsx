import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LessonCatalogProvider } from './features/lessons/LessonCatalogContext';
import { Home, SimplePractice } from './features/simple/SimpleTutor';
import './features/simple/simple-tutor.css';

const AdminPage = lazy(() => import('./features/admin/AdminPage'));

export default function App() {
  return <LessonCatalogProvider><BrowserRouter><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/practice" element={<SimplePractice />} />
    <Route path="/admin" element={<Suspense fallback={<p role="status" className="p-8">Loading admin workspace…</p>}><AdminPage /></Suspense>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></LessonCatalogProvider>;
}
