// ABOUTME: Unit tests for commission math; pure functions, no database needed.
// ABOUTME: Guards the gross = commission + net identity for every rate and amount.
import { describe, expect, it } from 'vitest';
import { splitCommission } from './money.ts';

describe('splitCommission', () => {
  it('splits 8.5% of $1,450.00 exactly', () => {
    expect(splitCommission(145000, 850)).toEqual({ commissionCents: 12325, netCents: 132675 });
  });

  it('rounds the commission half up to a whole cent', () => {
    // 333 * 850 / 10000 = 28.305 -> 28
    expect(splitCommission(333, 850).commissionCents).toBe(28);
    // 335 * 850 / 10000 = 28.475 -> 28 ; 1 cent * 5000bps = 0.5 -> 1
    expect(splitCommission(1, 5000).commissionCents).toBe(1);
  });

  it('always satisfies gross = commission + net', () => {
    for (const bps of [100, 850, 1000, 1234, 5000]) {
      for (const gross of [0, 1, 99, 333, 12345, 145000, 999999]) {
        const { commissionCents, netCents } = splitCommission(gross, bps);
        expect(commissionCents + netCents).toBe(gross);
        expect(netCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('rejects bad input instead of masking it', () => {
    expect(() => splitCommission(-1, 850)).toThrow(/gross/);
    expect(() => splitCommission(1.5, 850)).toThrow(/gross/);
    expect(() => splitCommission(100, 99)).toThrow(/bps/);
    expect(() => splitCommission(100, 5001)).toThrow(/bps/);
  });
});
