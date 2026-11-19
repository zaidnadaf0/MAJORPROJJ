import { Navigate, Route, Routes as RouterRoutes } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import { RequireCustomer } from './components/RequireCustomer';
import { ROUTE_DEFS, layoutFor } from '@/lib/routeDefs';

/**
 * Every portal route requires a signed-in Firebase user. Customer routes also
 * redirect mechanics/admins to their dedicated workspaces; backend rules are
 * still the authoritative security boundary.
 */
export function Routes() {
  return (
    <RouterRoutes>
      {ROUTE_DEFS.map((def) => {
        const Layout = layoutFor(def.portal);
        const Page = def.page!;
        const needsAuth = def.portal === 'customer' || def.portal === 'mechanic' || def.portal === 'admin';
        const content = <Page title={def.title} description={def.description} routePath={def.path} />;
        return (
          <Route
            key={def.path}
            path={def.path}
            element={
              needsAuth ? (
                <RequireAuth>
                  <Layout title={def.title} description={def.description} routePath={def.path}>
                    {def.portal === 'customer' ? <RequireCustomer>{content}</RequireCustomer> : content}
                  </Layout>
                </RequireAuth>
              ) : (
                <Layout title={def.title} description={def.description} routePath={def.path}>
                  <Page title={def.title} description={def.description} routePath={def.path} />
                </Layout>
              )
            }
          />
        );
      })}
      <Route path="*" element={<Navigate to="/" replace />} />
    </RouterRoutes>
  );
}
