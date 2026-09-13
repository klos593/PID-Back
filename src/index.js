import 'dotenv/config';
import { buildApp } from './app.js';
import { closePool } from './db/pool.js';

const app = buildApp();

app.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});

// Docker sends SIGTERM on `stop`/`down` and force-kills after a grace period.
// Close the HTTP server first so in-flight requests finish, then close the
// DB pool so connections don't get dropped mid-query.
async function shutdown(signal) {
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    await closePool();
    process.exit(0);
  } catch (err) {
    app.log.error(err, 'error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
