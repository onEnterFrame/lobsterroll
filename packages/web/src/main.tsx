import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Onboarding } from '@/pages/Onboarding';
import { AcceptInvite } from '@/pages/AcceptInvite';
import { Channel } from '@/pages/Channel';
import { Roster } from '@/pages/Roster';
import { Channels } from '@/pages/Channels';
import { Approvals } from '@/pages/Approvals';
import { Settings } from '@/pages/Settings';
import { Search } from '@/pages/Search';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/invite/:token" element={<AcceptInvite />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/channels" replace />} />
                <Route path="/channels" element={<Channels />} />
                <Route path="/channels/:channelId" element={<Channel />} />
                <Route path="/search" element={<Search />} />
                <Route path="/roster" element={<Roster />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
