import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/context/AuthContext';

export function Login() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
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

        <form onSubmit={handleSubmit} className="bg-ocean-light rounded-2xl p-6 shadow-xl border border-white/5">
          <label htmlFor="apiKey" className="block text-sm font-medium text-white/70 mb-2">
            API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="lr_..."
            autoFocus
            className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
          />

          {error && (
            <p className="mt-3 text-sm text-status-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="mt-4 w-full rounded-lg bg-lobster px-4 py-3 font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/30">
          Use an API key from your workspace to connect.
        </p>
      </div>
    </div>
  );
}
