import { useState } from 'react';
import { useNavigate } from 'react-router';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../../services/auth.service';

export const LoginForm = view(() => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const authService = useService(AuthService);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await authService.login({ email, password });

    setLoading(false);

    if (result.success) {
      navigate('/home', { replace: true });
    } else {
      setError(result.message || 'Login failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-slide-up">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-green-500/40 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-all placeholder-neutral-400 dark:placeholder-zinc-600"
          placeholder="you@example.com"
          disabled={loading}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-green-500/40 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-all placeholder-neutral-400 dark:placeholder-zinc-600"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 active:translate-y-0"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
});
