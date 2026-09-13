import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import csrfProtection from '@fastify/csrf-protection';
import sessionPlugin from './plugins/session.js';
import authRoutes from './routes/auth/index.js';
import subjectsRoutes from './routes/subjects/index.js';

/**
 * Arma la app de Fastify, pero no la levanta. Está separado de `index.js`
 * para que los tests puedan importar `buildApp()` y usar `app.inject()`: así
 * no se ocupa ningún puerto real, los tests son rápidos y no se pelean entre
 * ellos por el :4000.
 */
export function buildApp(opts = {}) {
  // trustProxy: Caddy termina el TLS y reenvía por HTTP plano, así que sin
  // esto Fastify ve todos los pedidos como si vinieran de la IP del contenedor
  // de Caddy — y los límites por IP no servirían para nada en producción.
  const app = Fastify({ logger: true, trustProxy: true, ...opts });

  app.register(rateLimit, {
    max: 20,
    timeWindow: '1 minute',
  });

  app.register(sessionPlugin);
  // La protección CSRF necesita que las cookies estén registradas antes
  // (guarda el secreto en una cookie firmada), así que va después de
  // sessionPlugin.
  app.register(csrfProtection, {
    cookieOpts: { signed: true },
  });

  // Los errores que arma Fastify traen internas en inglés ("Missing csrf
  // secret", "Route GET:/x not found") que se mostrarían tal cual en la UI,
  // que es toda en español. Acá se normaliza todo error que las rutas no
  // hayan manejado ellas mismas.
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
