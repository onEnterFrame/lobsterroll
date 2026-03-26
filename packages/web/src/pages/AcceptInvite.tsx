import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';

interface InviteDetails {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  workspace: { name: string; slug: string } | null;
}

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { mode, supabaseUser, refreshMe } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  // Fetch invite details
  useEffect(() => {
    if (!token) return;
    api
      .get<InviteDetails>(`/v1/invitations/by-token/${token}`)
      .then(setInvite)
      .catch((err) => setError(err.message ?? 'Invitation not found'))
      .finally(() => setLoading(false));
  }, [token]);

  // Not logged in — redirect to login, then come back
  if (mode === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ocean p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">🦞</div>
          <h1 className="text-2xl font-bold text-white mb-2">You've Been Invited</h1>
          <p className="text-white/60 mb-6">Sign in or create an account to accept this invitation.</p>
          <Link
            to="/login"
            className="inline-block rounded-lg bg-lobster px-6 py-3 font-semibold text-white transition hover:bg-lobster-light"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError('');
    try {
      await api.post('/v1/auth/accept-invitation', { token });
      await refreshMe();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ocean">
        <div className="text-4xl animate-bounce">🦞</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ocean p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-4">🦞</div>

        {error && !invite ? (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
            <p className="text-status-danger mb-6">{error}</p>
            <Link
              to="/"
              className="inline-block rounded-lg bg-ocean-light px-6 py-3 font-semibold text-white transition hover:bg-white/10 border border-white/10"
            >
              Go Home
            </Link>
          </>
        ) : invite ? (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">
              Join {invite.workspace?.name ?? 'Workspace'}
            </h1>
            <p className="text-white/60 mb-2">
              You've been invited as <span className="text-white capitalize">{invite.role}</span>
            </p>
            {supabaseUser && (
              <p className="text-white/40 text-sm mb-6">
                Signed in as {supabaseUser.email}
              </p>
            )}

            {invite.status !== 'pending' ? (
              <p className="text-white/60">This invitation has already been {invite.status}.</p>
            ) : new Date(invite.expiresAt) < new Date() ? (
              <p className="text-status-danger">This invitation has expired.</p>
            ) : (
              <>
                {error && <p className="mb-4 text-sm text-status-danger">{error}</p>}
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="rounded-lg bg-lobster px-8 py-3 font-semibold text-white transition hover:bg-lobster-light disabled:opacity-50"
                >
                  {accepting ? 'Joining...' : 'Accept Invitation'}
                </button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
