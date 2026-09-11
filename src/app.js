import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import csrfProtection from '@fastify/csrf-protection';
import sessionPlugin from './plugins/session.js';
import authRoutes from './routes/auth/index.js';
import subjectsRoutes from './routes/subjects/index.js';

/**
 * Builds (but does not start) the Fastify app. Separated from `index.js`
 * so tests can import `buildApp()` and use `app.inject()` — no real port
 * gets bound, so tests stay fast and don't fight each other for :4000.
 */
export function buildApp(opts = {}) {
  const app = Fastify({ logger: true, ...opts });

  app.register(rateLimit, {
    max: 20,
    timeWindow: '1 minute',
  });

  app.register(sessionPlugin);
  // CSRF protection depends on cookies being registered first (it stores
  // the secret in a signed cookie), so it comes after sessionPlugin.
  app.register(csrfProtection, {
    cookieOpts: { signed: true },
  });

  app.get('/', async () => {
    return { status: 'ok' };
  });

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(subjectsRoutes, { prefix: '/api/subjects' });

  return app;
}
