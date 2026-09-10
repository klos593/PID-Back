import Fastify from 'fastify';

/**
 * Builds (but does not start) the Fastify app. Separated from `index.js`
 * so tests can import `buildApp()` and use `app.inject()` — no real port
 * gets bound, so tests stay fast and don't fight each other for :4000.
 */
export function buildApp(opts = {}) {
  const app = Fastify({ logger: true, ...opts });

  app.get('/', async () => {
    return { status: 'ok' };
  });

  return app;
}
