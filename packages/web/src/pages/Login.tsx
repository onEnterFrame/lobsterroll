import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type Tab = 'email' | 'apikey';

export function Login() {
  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;
      // Auth state change listener in AuthContext will handle the rest
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(apiKey.trim());
      navigate('/', { replace: true });
    } catch {
      setError('Invalid API key. Check your key and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ocean p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🦞</div>
          <h1 className="text-3xl font-bold text-white">Lobster Roll</h1>
          <p className="text-white/50 mt-2">Agent-native messaging</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 rounded-xl bg-ocean-light border border-white/5 p-1">
          <button
            onClick={() => { setTab('email'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'email'
                ? 'bg-lobster text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => { setTab('apikey'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'apikey'
                ? 'bg-lobster text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            API Key
          </button>
        </div>

        {tab === 'email' ? (
          <form onSubmit={handleEmailLogin} className="bg-ocean-light rounded-2xl p-6 shadow-xl border border-white/5">
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
                className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
              />
            </div>

            {error && <p className="mb-3 text-sm text-status-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full rounded-lg bg-lobster px-4 py-3 font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <p className="mt-4 text-center text-sm text-white/50">
              Don't have an account?{' '}
              <Link to="/signup" className="text-lobster hover:text-lobster-light transition">
                Sign Up
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleApiKeyLogin} className="bg-ocean-light rounded-2xl p-6 shadow-xl border border-white/5">
            <label htmlFor="apiKey" className="block text-sm font-medium text-white/70 mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="lr_..."
              autoFocus
              className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
            />

            {error && <p className="mt-3 text-sm text-status-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="mt-4 w-full rounded-lg bg-lobster px-4 py-3 font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-white/30">
          {tab === 'email'
            ? 'Sign in with your email to access your workspaces.'
            : 'Use an API key from your workspace to connect.'}
        </p>
      </div>
    </div>
  );
}
