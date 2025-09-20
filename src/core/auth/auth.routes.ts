import { Elysia } from "elysia";
import { LoginPayloadSchema, RefreshTokenPayloadSchema } from "./auth.schema";
import { login, refreshToken } from "./auth.service";

const authRoutes = new Elysia({ prefix: "/auth" })
  .post("/login", ({ set, body }) => {
    set.status = 200;
    return login(body);
  }, {
    body: LoginPayloadSchema,
    detail: {
      summary: "User Login",
      description: "Authenticate user and return JWT tokens",
      tags: ["Authentication"],
    },
  })
  .post("/refresh-token", ({ set, body }) => {
    set.status = 200;
    return refreshToken(body);
  }, {
    body: RefreshTokenPayloadSchema,
    detail: {
      summary: "Refresh Token",
      description: "Refresh JWT tokens using a valid refresh token",
      tags: ["Authentication"],
    },
  });

export default authRoutes;
