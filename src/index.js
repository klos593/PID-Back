import 'dotenv/config';
import { buildApp } from './app.js';

const app = buildApp();

app.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
