import {
  LayoutDashboard,
  LogOut,
  Shirt,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandMark from './BrandMark';

const NAV_ITEMS = [
  {
    label: 'Overview',
    to: '/app/overview',
    icon: LayoutDashboard,
  },
  {
    label: 'Profile',
    to: '/app/profile',
    icon: UserRound,
  },
  {
    label: 'Wardrobe',
    to: '/app/wardrobe',
    icon: Shirt,
  },
  {
    label: 'Looks',
    to: '/app/recommendations',
    icon: Sparkles,
  },
];

const ROUTE_TITLES = {
  '/app/overview': {
    title: 'Overview',
    subtitle: 'Your app at a glance.',
  },
  '/app/profile': {
    title: 'Profile',
    subtitle: 'Photos and basics.',
  },
  '/app/wardrobe': {
    title: 'Wardrobe',
    subtitle: 'Your pieces and try-on.',
  },
  '/app/recommendations': {
    title: 'Looks',
    subtitle: 'Generate and try on outfits.',
  },
};

export default function AppShell() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const meta = ROUTE_TITLES[location.pathname] || ROUTE_TITLES['/app/overview'];

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <BrandMark compact />
        </div>

        <nav className="workspace-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `workspace-nav__link ${isActive ? 'workspace-nav__link--active' : ''}`
                }
              >
                <span className="workspace-nav__icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{item.label}</strong>
                </span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="shell__main">
        <header className="shell__topbar">
          <div className="page-heading">
            <p className="page-eyebrow">Dripdirective</p>
            <h2 className="page-title">{meta.title}</h2>
            {meta.subtitle ? <p className="page-subtitle">{meta.subtitle}</p> : null}
          </div>

          <div className="shell__actions">
            <div className="user-badge">
              <span className="user-badge__dot" />
              <div>
                <strong>{user?.email || 'Signed in'}</strong>
              </div>
            </div>

            <button type="button" className="button button--ghost" onClick={logout}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </header>

        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
