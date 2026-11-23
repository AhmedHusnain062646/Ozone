// ABOUTME: Hold expiry: lazy release (called before availability reads) and a background sweeper.
// ABOUTME: Both call the same single-statement release, so running them together is safe.
import { config } from '../config.ts';
import { logger } from '../http/logger.ts';
import * as inventory from '../repositories/inventory.ts';

/** Releases every expired hold. @returns the number of cart lines released. */
export const releaseExpiredHolds = () => inventory.releaseExpired();

/** Starts the periodic sweeper; returns a stop function. Overlapping runs are skipped, errors are logged. */
export function startReservationSweeper(intervalMs: number = config.sweepIntervalMs): () => void {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const released = await releaseExpiredHolds();
      if (released > 0) logger.info({ released }, 'reservation sweeper released expired holds');
    } catch (err) {
      logger.error({ err }, 'reservation sweeper failed');
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
