import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { accessForRecord, watchMyMechanicRecord, type MechanicAccess, type MechanicRecord } from '@/lib/mechanic';
import { DEMO_MECHANIC_PROFILE } from '@/lib/fixtures';

const DEMO_RECORD: MechanicRecord = {
  ...DEMO_MECHANIC_PROFILE,
  approved: DEMO_MECHANIC_PROFILE.approved ?? false,
  isAvailable: DEMO_MECHANIC_PROFILE.isAvailable ?? false,
  specialties: DEMO_MECHANIC_PROFILE.specialties ?? [],
};

export function useMechanicAccess(demoPreview = false, skipLiveCheck = false): { access: MechanicAccess | 'loading' | 'error'; record: MechanicRecord | null; retry: () => void } {
  const { user, status } = useAuth();
  const [record, setRecord] = useState<MechanicRecord | null | 'loading' | 'error'>(() => {
    if (demoPreview) return DEMO_RECORD;
    if (skipLiveCheck) return null;
    if (!user) return null;
    return 'loading';
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (status === 'loading') return;
    if (demoPreview || skipLiveCheck || !user) return; // Already derived during render
    setRecord('loading');
    const unsub = watchMyMechanicRecord(user.uid, (r) => setRecord(r), () => setRecord('error'));
    if (!unsub) setRecord('error');
    return () => {
      if (unsub) unsub();
    };
  }, [user, status, attempt, demoPreview, skipLiveCheck]);

  if (record === 'loading') return { access: 'loading', record: null, retry };
  if (record === 'error') return { access: 'error', record: null, retry };
  return { access: accessForRecord(record), record, retry };
}
