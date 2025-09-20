import { sql } from "bun";
import { TLoginPayload, TRefreshTokenPayload } from "./auth.schema";
import { verifyPassword } from "@/common/helpers/password.helper";
import { generateTokens, JWT_CONFIG, refreshTokens, verifyToken } from "@/common/helpers/jwt.helper";
import { successResponse, unauthorizedResponse } from "@/common/helpers/response.helper";
import { get } from "lodash";

export const login = async (payload: TLoginPayload) => {
  try {
    const { email, password } = payload;

    const userQuery = await sql`
    SELECT users.id, users.email, users.password, roles.access
    FROM users
    INNER JOIN roles ON users.role_id = roles.id
    WHERE users.email = ${email}
      AND users.is_active = true
      AND users.deleted_at IS NULL
      AND roles.is_active = true
      AND roles.deleted_at IS NULL`;

    const user = get(userQuery, "[0]", undefined);

    if (!user) {
      return unauthorizedResponse("Invalid email or password");
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return unauthorizedResponse("Invalid email or password");
    }

    // Generate JWT tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      roleAccess: user.access,
    });

    return successResponse("Login successful", tokens);
  } catch (error) {
    throw new Error(
      `Login failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const refreshToken = async (payload: TRefreshTokenPayload) => {
  const { refresh_token } = payload;

  try {
    const decoded = await verifyToken(
      refresh_token,
      JWT_CONFIG.refreshTokenSecret
    );

    if (!decoded.userId) {
      return unauthorizedResponse("Invalid refresh token");
    }

    // Fetch current user data from database
    const userQuery = await sql`
      SELECT users.id, users.email, roles.access
      FROM users
      INNER JOIN roles ON users.role_id = roles.id
      WHERE users.id = ${decoded.userId}
        AND users.is_active = true
        AND users.deleted_at IS NULL
        AND roles.is_active = true
        AND roles.deleted_at IS NULL`;

    const user = get(userQuery, "[0]", undefined);

    if (!user) {
      return unauthorizedResponse("User not found or inactive");
    }

    // Generate new tokens using the refresh function
    const tokens = await refreshTokens(refresh_token, {
      userId: user.id,
      email: user.email,
      roleAccess: user.access,
    });

    return successResponse("Token refreshed successfully", tokens);
  } catch (error) {
    throw new Error(
      `Token refresh failed: ${
        error instanceof Error ? error.message : "Invalid refresh token"
      }`
    );
  }
};
