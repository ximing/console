import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useService } from '@rabjs/react';
import AuthPage from './pages/auth';
import HomePage from './pages/home';
import SettingsPage from './pages/settings';
import NotFoundPage from './pages/not-found';
import { ProtectedRoute } from './components/protected-route';
import { ToastContainer } from './components/toast';
import { setNavigate } from './utils/navigation';
import { isElectron } from './electron/isElectron';
import { AuthService } from './services/auth.service';

// 内部组件，用于根据登录状态重定向根路由
function RootRoute() {
  const authService = useService(AuthService);

  // 如果已登录，跳转到首页；否则跳转到登录页
  if (authService.isAuthenticated) {
    return <Navigate to="/home" replace />;
  }
  return <Navigate to="/auth" replace />;
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
        <Route
          path="/settings/*"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
