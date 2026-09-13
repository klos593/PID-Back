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
  // trustProxy: Caddy terminates TLS and forwards over plain HTTP, so without
  // this Fastify sees every request as coming from Caddy's container IP —
  // which would make the per-IP rate limits meaningless in production.
  const app = Fastify({ logger: true, trustProxy: true, ...opts });

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

  // Fastify's built-in errors carry raw English internals ("Missing csrf
  // secret", "Route GET:/x not found") which would surface verbatim in the
  // Spanish UI. Normalize every error the routes didn't handle themselves.
  app.setErrorHandler((error, request, reply) => {
    const status = error.statusCode ?? 500;

    if (status >= 500) {
      request.log.error(error);
      return reply.code(status).send({ message: 'Ocurrió un error inesperado.' });
    }

    const messages = {
      403: 'Tu sesión expiró o el formulario no es válido. Recargá la página.',
      429: 'Demasiados intentos. Esperá un minuto y volvé a intentar.',
    };

    return reply.code(status).send({ message: messages[status] ?? error.message });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({ message: 'Recurso no encontrado' });
  });

  app.get('/', async () => {
    return { status: 'ok' };
  });

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(subjectsRoutes, { prefix: '/api/subjects' });

  return app;
}
