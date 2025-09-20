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

export type TLoginPayload = typeof LoginPayloadSchema.static;
export type TRefreshTokenPayload = typeof RefreshTokenPayloadSchema.static;
