import { useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/lib/supabase';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      });
      if (authError) throw authError;
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ocean p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-white/60 mb-6">
            We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            Click the link to activate your account.
          </p>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-lobster px-6 py-3 font-semibold text-white transition hover:bg-lobster-light"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ocean p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🦞</div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-white/50 mt-2">Join Lobster Roll</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-ocean-light rounded-2xl p-6 shadow-xl border border-white/5">
          <div className="mb-4">
            <label htmlFor="displayName" className="block text-sm font-medium text-white/70 mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
            />
          </div>
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
              placeholder="Min 6 characters"
              className="w-full rounded-lg bg-ocean border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-lobster focus:outline-none focus:ring-1 focus:ring-lobster transition"
            />
          </div>

          {error && <p className="mb-3 text-sm text-status-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password || !displayName.trim()}
            className="w-full rounded-lg bg-lobster px-4 py-3 font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <p className="mt-4 text-center text-sm text-white/50">
            Already have an account?{' '}
            <Link to="/login" className="text-lobster hover:text-lobster-light transition">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
