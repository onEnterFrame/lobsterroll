import { NavLink, Outlet } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import { useChannels } from '@/api/hooks';
import { usePresenceHeartbeat } from '@/hooks/usePresence';
import { useNotificationPermission } from '@/hooks/useNotifications';

const navItems = [
  { to: '/channels', label: 'Channels', icon: '#' },
  { to: '/search', label: 'Search', icon: '🔍' },
  { to: '/roster', label: 'Roster', icon: '👥' },
  { to: '/approvals', label: 'Approvals', icon: '✅' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function SidebarChannelList() {
  const { data: channels } = useChannels();

  if (!channels?.length) return null;

  return (
    <div className="mt-4">
      <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
        Channels
      </h3>
      <nav className="space-y-0.5">
        {channels.map((ch) => (
          <NavLink
            key={ch.id}
            to={`/channels/${ch.id}`}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                isActive
                  ? 'bg-lobster/20 text-lobster-light font-medium'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              }`
            }
          >
            <span className="text-white/30">#</span>
            <span className="truncate">{ch.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Layout() {
  const { currentAccount, logout } = useAuth();

  // Start presence heartbeat + idle detection for authenticated users
  usePresenceHeartbeat();
  // Request notification permission
  useNotificationPermission();

  return (
    <div className="flex h-screen bg-ocean">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-white/5 bg-ocean-light">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/5">
          <span className="text-2xl">🦞</span>
          <span className="font-bold text-lg text-white">Lobster Roll</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/channels'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-lobster/20 text-lobster-light'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          <SidebarChannelList />
        </nav>

        {/* User footer */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {currentAccount?.displayName}
              </p>
              <p className="text-xs text-white/40 truncate">
                {currentAccount?.accountType}
              </p>
            </div>
            <button
              onClick={logout}
              className="text-xs text-white/40 hover:text-white/70 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-white/10 bg-ocean-light/95 backdrop-blur">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition ${
                isActive ? 'text-lobster-light' : 'text-white/40'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden pb-16 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
