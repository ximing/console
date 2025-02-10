import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useService } from '@rabjs/react';
import AuthPage from './pages/auth';
import HomePage from './pages/home';
import SettingsPage from './pages/settings';
import TasksPage from './pages/tasks';
import { NotificationsPage } from './pages/notifications';
import NotFoundPage from './pages/not-found';
import CommandPalettePage from './pages/command-palette';
import GithubPage from './pages/github';
import BlogPage from './pages/blogs';
import AppsPage from './pages/apps';
import VersionsPage from './pages/apps/[appId]/versions';
import { ProtectedRoute } from './components/protected-route';
import { ToastContainer } from './components/toast';
import { CommandPalette } from './components/command-palette/command-palette';
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

// 内部组件，用于初始化认证状态
function AuthInitializer() {
  const authService = useService(AuthService);

  useEffect(() => {
    // 在组件挂载时检查认证状态
    // 这会验证 token 并连接 Socket.IO
    authService.checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
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
      <AuthInitializer />
      <AppContent />
      <ToastContainer />
      <CommandPalette />
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
        <Route
          path="/tasks/*"
          element={
            <ProtectedRoute>
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications/*"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/command-palette" element={<CommandPalettePage />} />
        <Route
          path="/github/*"
          element={
            <ProtectedRoute>
              <GithubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blogs/:id"
          element={
            <ProtectedRoute>
              <BlogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blogs"
          element={
            <ProtectedRoute>
              <BlogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apps"
          element={
            <ProtectedRoute>
              <AppsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apps/:appId/versions"
          element={
            <ProtectedRoute>
              <VersionsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
