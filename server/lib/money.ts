// ABOUTME: Integer-cent money helpers. Money is never a float in the server or the database.
// ABOUTME: Commission rates are basis points (850 = 8.5%), bounded 1%..50% like the sellers CHECK.

export const MIN_COMMISSION_BPS = 100;
export const MAX_COMMISSION_BPS = 5000;

/** Splits a gross amount into platform commission and seller net so that commission + net = gross.
 *  Commission is rounded half up to a whole cent; the net takes the remainder.
 *  @throws if gross is not a non-negative integer or bps is outside 100..5000. */
export function splitCommission(grossCents: number, commissionBps: number) {
  if (!Number.isInteger(grossCents) || grossCents < 0) {
    throw new Error(`splitCommission: gross must be a non-negative integer, got ${grossCents}`);
  }
  if (!Number.isInteger(commissionBps) || commissionBps < MIN_COMMISSION_BPS || commissionBps > MAX_COMMISSION_BPS) {
    throw new Error(`splitCommission: bps must be an integer in 100..5000, got ${commissionBps}`);
  }
  const commissionCents = Math.floor((grossCents * commissionBps + 5000) / 10000);
  return { commissionCents, netCents: grossCents - commissionCents };
}
