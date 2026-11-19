import * as functions from 'firebase-functions';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { RequestStatus } from './types';
import { requireCallerAdmin } from './admin';

/**
 * Admin recovery operations — SERVER-AUTHORITATIVE.
 *
 * Why these live on the server:
 *   `firestore.rules` deliberately has no admin `update` clause on
 *   `requests/{id}` and denies every client write to `auditEvents`
 *   (`allow create, update, delete: if false`). The earlier client-side
 *   implementation therefore could never succeed: every call returned
 *   'forbidden'. Rules are the trust boundary, so the capability moves here,
 *   where the Admin SDK writes legitimately and the CALLER is still checked
 *   against the `admin` custom claim by `requireCallerAdmin`.
 *
 * Both operations are idempotent in the sense that repeating them cannot
 * double-write: the second call sees the post-state and returns
 * 'invalid_state' (the request is no longer `requested`, or no longer live).
 */

/** Offer window + rematch window: a request older than this is stale. */
export const RECOVERY_STALE_MS = 10 * 60_000;

/** Statuses in which a job is held by a mechanic and may be recaptured. */
export const RECAPTURE_STATUSES: readonly RequestStatus[] = ['accepted', 'on-the-way', 'arrived', 'service'];

export type RecoveryOutcome = 'ok' | 'not_found' | 'invalid_state';

export interface RecoveryInput {
  requestId: string;
  reason: string;
}

/** Timestamps arrive as Firestore Timestamp, Date, millis or ISO string. */
export function msOf(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

/** Pure input contract: ids are bounded, reasons are 5–500 chars after trim. */
export function parseRecoveryInput(data: unknown): RecoveryInput | null {
  const raw = data as { requestId?: unknown; reason?: unknown } | null;
  const requestId = typeof raw?.requestId === 'string' ? raw.requestId.trim() : '';
  const reason = typeof raw?.reason === 'string' ? raw.reason.trim() : '';
  if (requestId.length === 0 || requestId.length > 128) return null;
  if (reason.length < 5 || reason.length > 500) return null;
  return { requestId, reason };
}

/**
 * A stale release applies only to an unassigned `requested` row whose offer
 * window has expired (or which is older than the rematch window). Pure.
 */
export function isReleaseEligible(
  input: { status?: unknown; createdAt?: unknown; offerExpiresAt?: unknown },
  nowMs: number,
): boolean {
  if (input.status !== 'requested') return false;
  const created = msOf(input.createdAt);
  const expiry = msOf(input.offerExpiresAt);
  const expired = expiry != null && expiry < nowMs;
  const stale = created != null && nowMs - created > RECOVERY_STALE_MS;
  return expired || stale;
}

/** A recapture applies only while a mechanic still holds a live job. Pure. */
export function isRecaptureEligible(status: unknown): boolean {
  return typeof status === 'string' && (RECAPTURE_STATUSES as readonly string[]).includes(status);
}

/** Fields cleared on every recovery so the row is genuinely unassigned again. */
const CLEARED_FIELDS = {
  mechanicId: null,
  mechanicName: null,
  mechanicLat: null,
  mechanicLng: null,
  mechanicLocationUpdatedAt: null,
} as const;

export const releaseStaleRequest = functions.https.onCall(async (data, context) => {
  requireCallerAdmin(context);
  const input = parseRecoveryInput(data);
  if (!input) {
    throw new functions.https.HttpsError('invalid-argument', 'requestId and a 5–500 character reason are required');
  }
  const actorUid = context.auth?.uid ?? 'unknown';
  const db = getFirestore();
  const ref = db.collection('requests').doc(input.requestId);

  const result = await db.runTransaction<RecoveryOutcome>(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 'not_found';
    const row = snap.data() ?? {};
    if (!isReleaseEligible(row, Date.now())) return 'invalid_state';

    tx.update(ref, {
      ...CLEARED_FIELDS,
      status: 'requested',
      releaseReason: input.reason,
      releasedAt: FieldValue.serverTimestamp(),
      releasedBy: actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection('auditEvents').doc(), {
      actorUid,
      action: 'release_stale',
      targetType: 'request',
      targetId: input.requestId,
      metadata: { reason: input.reason, source: 'admin_ui' },
      createdAt: FieldValue.serverTimestamp(),
    });
    return 'ok';
  });

  if (result === 'ok') console.log(`[recovery] ${input.requestId}: released stale by ${actorUid}`);
  return { result };
});

export const recaptureJob = functions.https.onCall(async (data, context) => {
  requireCallerAdmin(context);
  const input = parseRecoveryInput(data);
  if (!input) {
    throw new functions.https.HttpsError('invalid-argument', 'requestId and a 5–500 character reason are required');
  }
  const actorUid = context.auth?.uid ?? 'unknown';
  const db = getFirestore();
  const ref = db.collection('requests').doc(input.requestId);

  const result = await db.runTransaction<RecoveryOutcome>(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return 'not_found';
    const row = snap.data() ?? {};
    if (!isRecaptureEligible(row.status)) return 'invalid_state';

    const oldMechanicId = typeof row.mechanicId === 'string' ? row.mechanicId : null;
    if (oldMechanicId) {
      const counterRef = db.collection('mechanicCounters').doc(oldMechanicId);
      const counter = await tx.get(counterRef);
      const current = counter.exists ? counter.get('activeJobCount') : null;
      const next = typeof current === 'number' ? Math.max(0, current - 1) : 0;
      tx.set(counterRef, { mechanicId: oldMechanicId, activeJobCount: next }, { merge: true });
    }

    tx.update(ref, {
      ...CLEARED_FIELDS,
      status: 'requested',
      releaseReason: input.reason,
      releasedAt: FieldValue.serverTimestamp(),
      releasedBy: actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection('auditEvents').doc(), {
      actorUid,
      action: 'recapture_job',
      targetType: 'request',
      targetId: input.requestId,
      metadata: { reason: input.reason, source: 'admin_ui' },
      createdAt: FieldValue.serverTimestamp(),
    });
    return 'ok';
  });

  if (result === 'ok') console.log(`[recovery] ${input.requestId}: recaptured by ${actorUid}`);
  return { result };
});
