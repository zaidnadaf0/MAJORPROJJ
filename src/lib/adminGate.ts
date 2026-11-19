export type AdminGate = 'loading' | 'allow' | 'deny';

export function resolveAdminGate(authStatus: string, isAdmin: boolean | null): AdminGate {
  if (authStatus === 'loading' || (authStatus === 'authenticated' && isAdmin === null)) return 'loading';
  if (authStatus === 'authenticated' && isAdmin === true) return 'allow';
  return 'deny';
}
