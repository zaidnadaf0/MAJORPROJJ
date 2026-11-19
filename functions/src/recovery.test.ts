import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import {
  RECOVERY_STALE_MS,
  isRecaptureEligible,
  isReleaseEligible,
  msOf,
  parseRecoveryInput,
} from './recovery';

/**
 * Server-side recovery contract. These helpers decide eligibility BEFORE any
 * write, so a wrong answer either blocks a legitimate recovery or resets a
 * request that is not actually recoverable.
 */
describe('parseRecoveryInput', () => {
  it('accepts a bounded id and a trimmed 5–500 character reason', () => {
    expect(parseRecoveryInput({ requestId: ' req-1 ', reason: '  stale offer  ' })).toEqual({
      requestId: 'req-1',
      reason: 'stale offer',
    });
  });

  it('rejects a reason shorter than 5 characters after trim', () => {
    expect(parseRecoveryInput({ requestId: 'req-1', reason: '   nope   ' })).toBeNull();
  });

  it('rejects an over-long reason', () => {
    expect(parseRecoveryInput({ requestId: 'req-1', reason: 'x'.repeat(501) })).toBeNull();
  });

  it('rejects a missing/blank/oversized request id', () => {
    expect(parseRecoveryInput({ reason: 'valid reason' })).toBeNull();
    expect(parseRecoveryInput({ requestId: '   ', reason: 'valid reason' })).toBeNull();
    expect(parseRecoveryInput({ requestId: 'x'.repeat(129), reason: 'valid reason' })).toBeNull();
    expect(parseRecoveryInput(null)).toBeNull();
  });
});

describe('msOf', () => {
  it('normalises Timestamp, Date, millis and ISO strings', () => {
    const ms = 1_700_000_000_000;
    expect(msOf(Timestamp.fromMillis(ms))).toBe(ms);
    expect(msOf(new Date(ms))).toBe(ms);
    expect(msOf(ms)).toBe(ms);
    expect(msOf(new Date(ms).toISOString())).toBe(ms);
  });

  it('returns null for absent or unusable values', () => {
    expect(msOf(undefined)).toBeNull();
    expect(msOf(null)).toBeNull();
    expect(msOf('not-a-date')).toBeNull();
    expect(msOf({})).toBeNull();
  });
});

describe('isReleaseEligible', () => {
  const now = 1_700_000_000_000;

  it('rejects anything that is not an unassigned requested row', () => {
    for (const status of ['accepted', 'on-the-way', 'arrived', 'service', 'completed', 'cancelled', undefined]) {
      expect(isReleaseEligible({ status, createdAt: now - RECOVERY_STALE_MS * 2 }, now)).toBe(false);
    }
  });

  it('accepts when the offer window has expired', () => {
    expect(isReleaseEligible({ status: 'requested', offerExpiresAt: now - 1 }, now)).toBe(true);
  });

  it('accepts when the request is older than the stale window', () => {
    expect(isReleaseEligible({ status: 'requested', createdAt: now - RECOVERY_STALE_MS - 1 }, now)).toBe(true);
  });

  it('rejects a fresh request with a live offer window', () => {
    expect(
      isReleaseEligible({ status: 'requested', createdAt: now - 1_000, offerExpiresAt: now + 60_000 }, now),
    ).toBe(false);
  });

  it('rejects a requested row with no usable timestamps', () => {
    expect(isReleaseEligible({ status: 'requested' }, now)).toBe(false);
  });
});

describe('isRecaptureEligible', () => {
  it('accepts only live mechanic-held statuses', () => {
    for (const status of ['accepted', 'on-the-way', 'arrived', 'service']) {
      expect(isRecaptureEligible(status)).toBe(true);
    }
    for (const status of ['requested', 'completed', 'cancelled', undefined, 42]) {
      expect(isRecaptureEligible(status)).toBe(false);
    }
  });
});
