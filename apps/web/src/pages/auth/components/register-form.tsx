import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { useNavigate } from 'react-router';
import { AuthService } from '../../../services/auth.service';

export const RegisterForm = view(() => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const authService = useService(AuthService);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!email || !password || !confirmPassword || !username) {
      setError('Please fill in all required fields');
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const result = await authService.register({
      email,
      password,
      username,
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setUsername('');

      // Auto navigate to login page after successful registration
      navigate('/auth?mode=login', { replace: true });
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-slide-up">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm animate-slide-up">
          Registration successful! You can now sign in.
        </div>
      )}

      <div>
        <label
          htmlFor="register-email"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2"
        >
          Email <span className="text-red-400">*</span>
        </label>
        <input
          id="register-email"
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
          htmlFor="username"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2"
        >
          Username <span className="text-red-400">*</span>
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-green-500/40 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-all placeholder-neutral-400 dark:placeholder-zinc-600"
          placeholder="Your name"
          disabled={loading}
        />
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2"
        >
          Password <span className="text-red-400">*</span>
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 bg-neutral-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-green-500/40 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-all placeholder-neutral-400 dark:placeholder-zinc-600"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2"
        >
          Confirm Password <span className="text-red-400">*</span>
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
});
