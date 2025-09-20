import { t } from "elysia";

export const LoginPayloadSchema = t.Object({
  email: t.String({
    format: "email",
    error: "Email is not valid",
  }),
  password: t.String({
    minLength: 1,
    error: "Password is required",
  }),
});

export const RefreshTokenPayloadSchema = t.Object({
  refresh_token: t.String({
    minLength: 1,
    error: "Refresh token is required",
  }),
});

export const TokenResponseSchema = t.Object({
  access_token: t.String({
    description: "JWT access token for authentication",
  }),
  refresh_token: t.String({
    description: "JWT refresh token for token renewal",
  }),
});

export const LoginResponseSchema = t.Object({
  code: t.Number({
    description: "Response status code",
  }),
  message: t.String({
    description: "Response message",
  }),
  data: TokenResponseSchema,
});

export type TLoginPayload = typeof LoginPayloadSchema.static;
export type TRefreshTokenPayload = typeof RefreshTokenPayloadSchema.static;
export type TTokenResponse = typeof TokenResponseSchema.static;
export type TLoginResponse = typeof LoginResponseSchema.static;
