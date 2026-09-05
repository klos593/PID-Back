import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/', async () => {
    return { status: 'ok' };
});

app.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
    if (err) {
        app.log.error(err);
    process.exit(1);
    }
});