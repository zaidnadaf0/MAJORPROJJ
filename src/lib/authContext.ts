import { createContext } from 'react';
import type { User } from 'firebase/auth';
import type { ProfileHint } from '@/lib/userProfile';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  /** True after the current user's role hint and admin claim have resolved. */
  authorizationResolved: boolean;
  /** False when no Firebase config is present — auth calls throw a clear error. */
  configured: boolean;
  user: User | null;
  emailVerified: boolean;
  /** Role hint from `users/{uid}.role`. UI routing convenience ONLY — never authority. */
  profileRole: ProfileHint | null;
  /**
   * Admin authority from the Firebase ID-token custom claim.
   * null = unknown (or unconfigured). Minted server-side in a later phase;
   * until then this is always false for real users. Never set from the client.
   */
  isAdmin: boolean | null;
  home: string;
  signUp: (input: SignUpInput) => Promise<void>;
  /** Resolves to the correct portal home after role/claim hints are loaded. */
  signIn: (email: string, password: string, portal?: 'customer' | 'mechanic' | 'admin') => Promise<string>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Force-refresh the ID token (picks up a freshly minted claim). */
  refreshClaim: () => Promise<void>;
  /** Explicit local presentation mode. Demo records never touch Firebase. */
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  /** Changes whenever another demo tab mutates the isolated workflow. */
  demoRevision: number;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
