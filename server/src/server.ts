import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const app = createApp();
const server = app.listen(env.PORT, env.HOST, () => {
  logger.info("server_started", {
    host: env.HOST,
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});

function shutDown(signal: NodeJS.Signals): void {
  logger.info("server_shutdown_started", { signal });
  server.close((error) => {
    if (error) {
      logger.error("server_shutdown_failed", { error: error.message });
      process.exitCode = 1;
      return;
    }

    process.exitCode = 0;
  });
}

process.once("SIGINT", shutDown);
process.once("SIGTERM", shutDown);
