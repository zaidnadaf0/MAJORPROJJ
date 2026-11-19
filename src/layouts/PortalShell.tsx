import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/cn';
import type { NavGroup, NavItem } from '@/lib/nav';
import { useAuth } from '@/lib/useAuth';
import { badgeLabel, useUnreadCount } from '@/lib/useUnreadCount';
import { DemoNotice } from '@/components/ui';
import { Brand } from './PublicLayout';

/** Unread pill for the notifications nav entry (hidden when zero). */
function UnreadBadge({ route }: { route: string }) {
  const { user, demoMode } = useAuth();
  const isNotifications = route.endsWith('/notifications');
  const badge = badgeLabel(useUnreadCount(user?.uid ?? '', demoMode, isNotifications));
  if (!isNotifications || !badge) return null;
  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-safety-500 px-1.5 text-[10px] font-semibold text-white"
      aria-label={`${badge} unread notifications`}
    >
      {badge}
    </span>
  );
}

function SidebarLink({ item, home }: { item: NavItem; home: string }) {
  const { pathname } = useLocation();
  const active = pathname === item.route || (item.route !== home && pathname.startsWith(item.route));
  return (
    <li>
      <NavLink
        to={item.route}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
          active
            ? 'bg-safety-50 text-safety-700'
            : 'text-steel-400 hover:bg-graphite-soft hover:text-cream',
        )}
      >
        <Icon name={item.icon} size={17} className={active ? 'text-safety-600' : 'text-steel-500 group-hover:text-steel-400'} />
        <span className="truncate">{item.label}</span>
        <UnreadBadge route={item.route} />
      </NavLink>
    </li>
  );
}

export interface PortalShellProps {
  title: string;
  description?: string;
  routePath: string;
  children: ReactNode;
  portalLabel: string;
  home: string;
  groups: NavGroup[];
  tabs: NavItem[];
  /** Portal-specific notifications inbox route. */
  notificationsPath: string;
  /** Admin-only demo/live switch, preserving the previous behaviour. */
  demoControls?: boolean;
}

/**
 * One portal shell for customer, mechanic and admin. A single navigation
 * model, a single sign-out path and a single unread badge keep the three
 * workspaces visually identical — the previous build had two divergent shells.
 */
export function PortalShell({
  title,
  description,
  routePath,
  children,
  portalLabel,
  home,
  groups,
  tabs,
  notificationsPath,
  demoControls = false,
}: PortalShellProps) {
  const { demoMode, setDemoMode, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const unread = badgeLabel(useUnreadCount(user?.uid ?? '', demoMode, true));

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // Firebase sign-out is independent of Firestore reads; always leave this
      // gated page so the login screen remains reachable.
    } finally {
      navigate('/login', { replace: true });
      setSigningOut(false);
    }
  }

  const identity = user?.displayName || user?.email || portalLabel;

  return (
    <div className="min-h-screen bg-grease text-cream">
      <a href="#main-content" className="ra-skip-link">Skip to content</a>
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside
          className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line-soft bg-graphite-card lg:flex"
          aria-label="Portal navigation"
        >
          <div className="flex h-16 items-center border-b border-line-soft px-4">
            <Brand />
          </div>

          <div className="flex items-center gap-2 px-4 pb-2 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-safety-500/20 bg-safety-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-safety-700">
              {portalLabel}
            </span>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {groups.map((g) => (
              <div key={g.label} className="mt-3 first:mt-0">
                <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-steel-500">
                  {g.label}
                </p>
                <ul className="grid gap-0.5">
                  {g.items.map((item) => (
                    <SidebarLink key={item.route} item={item} home={home} />
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-line-soft p-3">
            <Link
              to="/"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-steel-400 transition-colors hover:bg-graphite-soft hover:text-cream"
            >
              <Icon name="home" size={17} className="text-steel-500" />
              Public site
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-steel-400 transition-colors hover:bg-graphite-soft hover:text-cream disabled:opacity-60"
            >
              <Icon name="logout" size={17} className="text-steel-500" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1 pb-24 lg:pb-10">
          {/* Desktop top bar */}
          <div className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b border-line-soft bg-grease/85 px-6 backdrop-blur-xl lg:flex">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-cream">{title}</p>
              {description && <p className="truncate text-xs text-steel-500">{description}</p>}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link
                to={notificationsPath}
                aria-label="Notifications"
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-line-soft bg-graphite-card text-steel-400 transition-colors hover:text-cream"
              >
                <Icon name="bell" size={17} />
                {unread && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-safety-500 px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <span className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-line-soft bg-graphite-card py-1 pl-1 pr-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-safety-50 text-[11px] font-bold uppercase text-safety-700">
                  {identity.slice(0, 2)}
                </span>
                <span className="truncate text-xs font-medium text-steel-300">{identity}</span>
              </span>
            </div>
          </div>

          <div className="px-4 pb-6 pt-5 sm:px-6 lg:px-8 lg:pt-6">
            {/* Demo / mode banner */}
            {demoControls ? (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {demoMode ? (
                  <DemoNotice>
                    Demo mode — sample data only. Actions stay in this browser and never write to Firebase.
                  </DemoNotice>
                ) : (
                  <p role="status" className="rounded-xl border border-line-soft bg-graphite-card px-4 py-3 text-sm text-steel-400">
                    Live mode — records are read from Firebase.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setDemoMode(!demoMode)}
                  className="h-10 rounded-xl border border-line-soft bg-graphite-card px-3 text-xs font-semibold text-cream transition-colors hover:border-line-strong"
                >
                  {demoMode ? 'Switch to live Firebase' : 'Use isolated demo data'}
                </button>
              </div>
            ) : (
              demoMode && (
                <div className="mb-4">
                  <DemoNotice>Demo mode is active. Sample records and actions stay in this browser and never write to Firebase.</DemoNotice>
                </div>
              )
            )}

            <main id="main-content" tabIndex={-1} className="focus:outline-none">
              <div key={demoControls ? String(demoMode) : undefined} className="portal-content animate-ra-fade-in">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-line-soft bg-grease/90 px-4 backdrop-blur-xl lg:hidden">
        <Brand compact />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cream">{title}</span>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="shrink-0 rounded-lg border border-line-soft bg-graphite-card px-2.5 py-1.5 text-xs font-medium text-steel-300 disabled:opacity-60"
        >
          {signingOut ? '…' : 'Sign out'}
        </button>
      </div>
      <div className="h-14 lg:hidden" aria-hidden />

      {/* Mobile tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-graphite-card/95 backdrop-blur-xl"
        aria-label={`${portalLabel} tabs`}
      >
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => (
            <li key={tab.route}>
              <NavLink
                to={tab.route}
                end={tab.route === home}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors',
                    isActive ? 'text-safety-600' : 'text-steel-500 hover:text-cream',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'absolute inset-x-5 top-0 h-0.5 rounded-full transition-opacity',
                        isActive ? 'bg-safety-500 opacity-100' : 'opacity-0',
                      )}
                      aria-hidden
                    />
                    <Icon name={tab.icon} size={20} />
                    <span className="truncate">{tab.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <span className="hidden" data-route={routePath} data-title={title} data-description={description} />
    </div>
  );
}
