import { getConfig } from '@/common/config';

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  roleAccess: any;
  iat?: number;
  exp?: number;
}

// Token response interface
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

// JWT configuration
export const JWT_CONFIG = {
  accessTokenSecret: getConfig('JWT_ACCESS_SECRET', 'your-access-token-secret-key'),
  refreshTokenSecret: getConfig('JWT_REFRESH_SECRET', 'your-refresh-token-secret-key'),
  accessTokenExpiry: getConfig('JWT_ACCESS_EXPIRY', '15m'), // 15 minutes
  refreshTokenExpiry: getConfig('JWT_REFRESH_EXPIRY', '7d'), // 7 days
};

/**
 * Generates JWT tokens (access and refresh) for a user
 * @param payload - User data to include in the token
 * @returns Object containing access_token and refresh_token
 */
export async function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenResponse> {
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Calculate expiration times
  const accessTokenExp = currentTime + parseExpiry(JWT_CONFIG.accessTokenExpiry);
  const refreshTokenExp = currentTime + parseExpiry(JWT_CONFIG.refreshTokenExpiry);

  // Create access token payload
  const accessTokenPayload: JWTPayload = {
    ...payload,
    iat: currentTime,
    exp: accessTokenExp,
  };

  // Create refresh token payload (minimal data for security)
  const refreshTokenPayload = {
    userId: payload.userId,
    iat: currentTime,
    exp: refreshTokenExp,
  };

  try {
    // Generate tokens using Bun's built-in JWT functionality
    const accessToken = await signJWT(accessTokenPayload, JWT_CONFIG.accessTokenSecret);
    const refreshToken = await signJWT(refreshTokenPayload, JWT_CONFIG.refreshTokenSecret);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  } catch (error) {
    throw new Error(`Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verifies and decodes a JWT token
 * @param token - JWT token to verify
 * @param secret - Secret key for verification
 * @returns Decoded payload
 */
export async function verifyToken(token: string, secret: string): Promise<any> {
  try {
    return await verifyJWT(token, secret);
  } catch (error) {
    throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Invalid token'}`);
  }
}

/**
 * Refreshes JWT tokens using a valid refresh token
 * @param refreshToken - Valid refresh token
 * @param userPayload - User data to include in new tokens
 * @returns New token pair
 */
export async function refreshTokens(refreshToken: string, userPayload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenResponse> {
  try {
    // Verify the refresh token
    const decoded = await verifyToken(refreshToken, JWT_CONFIG.refreshTokenSecret);
    
    // Check if the user ID matches
    if (decoded.userId !== userPayload.userId) {
      throw new Error('Token user mismatch');
    }
    
    // Generate new tokens
    return await generateTokens(userPayload);
  } catch (error) {
    throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Invalid refresh token'}`);
  }
}

/**
 * Signs a JWT token using Bun's built-in functionality
 * @param payload - Token payload
 * @param secret - Secret key
 * @returns Signed JWT token
 */
async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(data));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${data}.${encodedSignature}`;
}

/**
 * Verifies a JWT token using Bun's built-in functionality
 * @param token - JWT token to verify
 * @param secret - Secret key
 * @returns Decoded payload
 */
async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  
  // Verify signature
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = Uint8Array.from(atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const isValid = await crypto.subtle.verify('HMAC', secretKey, signature, encoder.encode(data));
  
  if (!isValid) {
    throw new Error('Invalid token signature');
  }

  // Decode payload
  const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
  
  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token has expired');
  }

  return payload;
}

/**
 * Parses expiry string to seconds
 * @param expiry - Expiry string (e.g., '15m', '7d', '1h')
 * @returns Expiry time in seconds
 */
function parseExpiry(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1));

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return parseInt(expiry); // Assume seconds if no unit
  }
}