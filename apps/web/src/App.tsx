import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router';
import { useEffect } from 'react';
import AuthPage from './pages/auth';
import HomePage from './pages/home';
import LandingPage from './pages/landing';
import NotFoundPage from './pages/not-found';
import { ProtectedRoute } from './components/protected-route';
import { ToastContainer } from './components/toast';
import { setNavigate } from './utils/navigation';
import { isElectron } from './electron/isElectron';

// 内部组件，用于根据环境渲染根路由
function RootRoute() {
  if (isElectron()) {
    return <Navigate to="/home" replace />;
  }
  return <LandingPage />;
}

// 内部组件，用于初始化 navigate 函数
function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // 在组件挂载时设置 navigate 函数
    setNavigate(navigate);
  }, [navigate]);

  return null;
}

function App() {
  const Router = isElectron() ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AppContent />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
