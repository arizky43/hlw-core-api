import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { getConfig, getConfigNumber } from "./common/config";
import authRoutes from "./core/auth/auth.routes";
import usersV1Routes from "./builder/users/v1/users-v1.routes";
import rolesV1Routes from "./builder/roles/v1/roles-v1.routes";
import { createElysiaHelperErrorHandler, ConsoleLogger } from "./common/errors";

const nodeEnv = getConfig("NODE_ENV", "development");

const helperErrorHandler = createElysiaHelperErrorHandler({
  logger: new ConsoleLogger(),
  isProduction: nodeEnv === "production",
  enableDetailedLogging: nodeEnv !== "production",
  enableStackTrace: nodeEnv !== "production",
  logLevel: nodeEnv === "production" ? "error" : "debug",
});

const app = new Elysia()
  .onError(helperErrorHandler)
  .use(openapi())
  .use(authRoutes)
  .use(usersV1Routes)
  .use(rolesV1Routes)
  .get("/", () => "Hello Elysia")
  .listen(getConfigNumber("APP_PORT", 3001));

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
