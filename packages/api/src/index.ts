import { loadConfig } from './config.js';
import { createApp } from './app.js';

async function main() {
  const config = loadConfig();
  const app = await createApp(config);

  try {
    await app.listen({ host: config.API_HOST, port: config.API_PORT });
    app.log.info(`Server listening on ${config.API_HOST}:${config.API_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
