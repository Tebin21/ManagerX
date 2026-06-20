import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/generate', label: 'Generate License' },
  { to: '/licenses', label: 'Licenses' },
  { to: '/customers', label: 'Customers' },
];

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <span className="text-sm font-bold tracking-tight text-slate-900">
              ManagerX <span className="text-brand-600">License Admin</span>
            </span>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
