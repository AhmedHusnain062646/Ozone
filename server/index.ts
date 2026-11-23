// ABOUTME: Process entry point: starts the HTTP server and shuts down cleanly on SIGINT/SIGTERM.
// ABOUTME: Also starts the reservation sweeper that releases expired stock holds.
import { config } from './config.ts';
import { createApp } from './app.ts';
import { closeDb } from './db/client.ts';
import { logger } from './http/logger.ts';
import { startReservationSweeper } from './services/reservations.ts';

const server = createApp().listen(config.port, () => {
  logger.info({ port: config.port, production: config.isProduction }, 'api listening');
});

const stopSweeper = startReservationSweeper();

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  stopSweeper();
  server.close(() => closeDb().finally(() => process.exit(0)));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
