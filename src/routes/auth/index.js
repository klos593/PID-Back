import { createUser, emailExists, findUserByEmail } from '../../db/users.js';
import { countExistingSubjectIds } from '../../db/subjects.js';
import { checkPasswordStrength, hashPassword, verifyPassword } from '../../lib/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// En español porque es el contrato con el frontend: son los valores que manda
// el formulario de registro y los que la UI compara (ver PID-Front/CLAUDE.md).
// El enum user_role de la base usa las mismas dos etiquetas.
const ROLES = ['docente', 'alumno'];

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    nombre: user.nombre,
    apellido: user.apellido,
    telefono: user.telefono,
  };
}

export default async function authRoutes(app) {
  // El cliente pega acá primero para conseguir un token, y después lo manda
  // en el header `x-csrf-token` en register/login/logout.
  app.get('/csrf-token', async (request, reply) => {
    return reply.send({ csrfToken: await reply.generateCsrf() });
  });

  app.get('/check-email', async (request, reply) => {
    const email = request.query?.email;
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return reply.code(400).send({ message: 'Email inválido' });
    }
    const taken = await emailExists(email.toLowerCase());
    return reply.send({ available: !taken });
  });

  app.post(
    '/register',
    {
      onRequest: app.csrfProtection,
      // El registro corre un hash argon2id a propósito lento en cada pedido,
      // así que necesita un tope más bajo que el límite global.
      config: {
        rateLimit: { max: 5, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const {
        email,
        password,
        role,
        nombre,
        apellido,
        telefono,
        subjectIds = [],
      } = request.body ?? {};

      if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
        return reply.code(400).send({ message: 'Email inválido', fields: { email: 'invalid' } });
      }
      if (!ROLES.includes(role)) {
        return reply.code(400).send({ message: 'Rol inválido', fields: { role: 'invalid' } });
      }
      if (typeof nombre !== 'string' || !nombre.trim()) {
        return reply
          .code(400)
          .send({ message: 'El nombre es obligatorio', fields: { nombre: 'required' } });
      }
      if (typeof apellido !== 'string' || !apellido.trim()) {
        return reply
          .code(400)
          .send({ message: 'El apellido es obligatorio', fields: { apellido: 'required' } });
      }

      const strengthError = checkPasswordStrength(password);
      if (strengthError) {
        return reply.code(400).send({ message: strengthError, fields: { password: 'weak' } });
      }

      let cleanSubjectIds = [];
      if (role === 'docente') {
        cleanSubjectIds = Array.isArray(subjectIds) ? [...new Set(subjectIds)] : [];
        if (cleanSubjectIds.length > 0) {
          const validCount = await countExistingSubjectIds(cleanSubjectIds);
          if (validCount !== cleanSubjectIds.length) {
            return reply.code(400).send({
              message: 'Una o más materias seleccionadas no existen',
              fields: { subjectIds: 'invalid' },
            });
          }
        }
      }

      const normalizedEmail = email.toLowerCase();
      const existing = await findUserByEmail(normalizedEmail);
      if (existing) {
        return reply
          .code(409)
          .send({ message: 'Ya existe una cuenta con ese email', fields: { email: 'taken' } });
      }

      const passwordHash = await hashPassword(password);
      const user = await createUser({
        email: normalizedEmail,
        passwordHash,
        role,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: typeof telefono === 'string' && telefono.trim() ? telefono.trim() : null,
        subjectIds: cleanSubjectIds,
      });

      await app.createUserSession(reply, user.id);

      return reply.code(201).send(toPublicUser(user));
    }
  );

  app.post(
    '/login',
    {
      onRequest: app.csrfProtection,
      config: {
        rateLimit: { max: 5, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body ?? {};

      if (typeof email !== 'string' || typeof password !== 'string') {
        return reply.code(400).send({ message: 'Email y contraseña son requeridos' });
      }

      const user = await findUserByEmail(email.toLowerCase());
      // El mismo error para "no existe el usuario" y "contraseña incorrecta",
      // así no se filtra qué emails están registrados.
      if (!user || !(await verifyPassword(user.password_hash, password))) {
        return reply.code(401).send({ message: 'Credenciales inválidas' });
      }

      await app.createUserSession(reply, user.id);

      return reply.send(toPublicUser(user));
    }
  );

  app.post('/logout', { onRequest: app.csrfProtection }, async (request, reply) => {
    await app.destroyUserSession(request, reply);
    return reply.code(204).send();
  });

  app.get('/me', { onRequest: app.requireAuth }, async (request, reply) => {
    return reply.send(request.user);
  });
}
