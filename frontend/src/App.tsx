import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./features/layout/Layout";
import { LearningProvider, useLearningData } from "./data/LearningContext";

const Achievements = lazy(() => import("./features/achievements/Achievements"));
const AdminCMS = lazy(() => import("./features/admin/AdminCMS"));
const Profile = lazy(() => import("./features/account/Profile"));
const Login = lazy(() => import("./features/auth/Login"));
const Register = lazy(() => import("./features/auth/Register"));
const Dashboard = lazy(() => import("./features/dashboard/Dashboard"));
const Landing = lazy(() => import("./features/landing/Landing"));
const Leaderboard = lazy(() => import("./features/leaderboard/Leaderboard"));
const Lessons = lazy(() => import("./features/lessons/Lessons"));
const Practice = lazy(() => import("./features/practice/Practice"));
const Progress = lazy(() => import("./features/progress/Progress"));
const Settings = lazy(() => import("./features/settings/Settings"));
const Test = lazy(() => import("./features/tests/Test"));

function PageLoading() {
  return <div className="p-8 text-sm text-[#64748B]" role="status">Loading your page…</div>;
}

function ProtectedApp() {
  const { learner } = useLearningData();
  if (!learner) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/test" element={<Test />} />
          <Route path="/lessons" element={<Lessons />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminCMS />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <LearningProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LearningProvider>
  );
}
