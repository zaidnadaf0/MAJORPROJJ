import { useEffect, useState } from 'react';
import { countUnread, watchNotifications, type AppNotification } from './customer';
import { DEMO_NOTIFICATIONS } from './fixtures';

/**
 * Live unread-notification count for the portal navigation badges.
 * Demo mode counts the fixtures (derived during render — no effect needed);
 * live mode subscribes to the signed-in user's inbox (bounded 50 — the same
 * query the inbox page uses) and updates as server notices arrive. Pass
 * `enabled=false` for nav entries that are not the notifications link: the
 * hook stays hooks-rule safe (no conditional calls) while only the real entry
 * subscribes. Returns null while the first snapshot is pending so callers
 * can hide the badge rather than flash 0.
 */
export function useUnreadCount(uid: string, demoMode: boolean, enabled = true): number | null {
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const demoCount = demoMode ? countUnread(DEMO_NOTIFICATIONS) : null;
  // Demo mode takes priority: derived during render, no setState in effect.
  const count = demoMode ? demoCount : liveCount;

  useEffect(() => {
    if (!enabled || demoMode || !uid) return;
    const unsub = watchNotifications(
      uid,
      (items: AppNotification[]) => setLiveCount(countUnread(items)),
      () => setLiveCount(0),
    );
    return () => {
      if (unsub) unsub();
    };
  }, [uid, demoMode, enabled]);

  return count;
}

/** Display form for the nav badge: hidden at 0, capped so wide counts fit. Pure — tested. */
export function badgeLabel(count: number | null): string | null {
  if (count == null || count <= 0) return null;
  return count > 9 ? '9+' : String(count);
}
