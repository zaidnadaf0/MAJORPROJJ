import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import { resolveAuthRedirect } from '@/lib/authRouting';
import { LoadingState } from '@/components/ui';

/**
 * Route guard for authentication; portal-specific guards enforce role/claim access.
 *
 * Returns the redirect target for a (status, configured, pathname) triple,
 * or null when the route may render. Pure — unit-tested.
 *
 * Deliberately role-blind: no client-side role check can ever be a security
 * boundary. Role-based enforcement arrives with M3 Firestore rules; until
 * then every authenticated user may reach every portal shell.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, configured } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <LoadingState label="Checking sign-in…" />
      </main>
    );
  }

  const to = resolveAuthRedirect(status, configured, location.pathname);
  if (to) return <Navigate to={to} replace />;
  return <>{children}</>;
}
