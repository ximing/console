import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { getAuthConfig } from '../../api/auth';
import { LoginForm } from './components/login-form';
import { RegisterForm } from './components/register-form';
import logoLight from '../../assets/logo.png';
import logoDark from '../../assets/logo-dark.png';

export const AuthPage = view(() => {
  const [searchParams] = useSearchParams();
  const authService = useService(AuthService);
  const navigate = useNavigate();
  const isLogin = searchParams.get('mode') !== 'register';
  const [allowRegistration, setAllowRegistration] = useState(true);

  // Fetch auth config on mount
  useEffect(() => {
    getAuthConfig()
      .then((res) => {
        if (res && res.code === 0 && res.data) {
          setAllowRegistration(res.data.allowRegistration);
        }
      })
      .catch(() => {
        // Default to true if fetch fails
        setAllowRegistration(true);
      });
  }, []);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [authService.isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-zinc-950 px-4 relative overflow-hidden dark:[background:radial-gradient(ellipse_at_50%_40%,#27272a_0%,#09090b_100%)]">
      <div className="w-full max-w-md relative">
        <div className="bg-white/80 dark:bg-zinc-800/60 backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-2xl p-8 animate-fade-in ring-1 ring-black/[0.04] dark:ring-white/[0.08]">
          {/* Logo */}
          <div className="text-center mb-6">
            <img src={logoLight} alt="Console Logo" className="h-12 w-12 mx-auto dark:hidden" />
            <img
              src={logoDark}
              alt="Console Logo"
              className="h-12 w-12 mx-auto hidden dark:block"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              {isLogin ? 'Sign in to your workspace' : 'Get started with your workspace'}
            </p>
          </div>

          {/* Forms */}
          {isLogin ? <LoginForm /> : <RegisterForm />}

          {/* Toggle */}
          {allowRegistration && (
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  const nextMode = isLogin ? 'register' : 'login';
                  navigate(`/auth?mode=${nextMode}`, { replace: true });
                }}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 font-medium transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-zinc-400 dark:text-zinc-600 mt-8">
          Your personal memo assistant
        </p>
      </div>
    </div>
  );
});
