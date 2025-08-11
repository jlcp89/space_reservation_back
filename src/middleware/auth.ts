import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
// Node 18 (esp. alpine) may not expose Web Crypto as globalThis.crypto; jose expects it. Polyfill if missing.
// This must run before any dynamic imports of 'jose'.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { webcrypto } = require('crypto');
  if (webcrypto && !(globalThis as any).crypto) {
    (globalThis as any).crypto = webcrypto;
    // Minimal log once (avoid noisy output in prod)
    // console.log('ℹ️ WebCrypto polyfilled for jose');
  }
} catch (e) {
  // If polyfill fails we continue; jose will throw later and existing error handling will respond 500/401
}
// jose is ESM-only; we'll import dynamically where needed to keep compatibility with ts-node CommonJS execution.
// Types for local use
type JoseModule = typeof import('jose');
type JWTVerifyResult = import('jose').JWTVerifyResult;

interface CognitoUser {
  sub: string;
  email: string;
  'custom:role'?: string;
  'cognito:username': string;
  exp: number;
  iat: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: CognitoUser;
    }
  }
}

export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  console.log('🔑 API Key authentication middleware called for:', req.method, req.originalUrl);
  const apiKey = req.header('X-API-Key') || req.header('Authorization')?.replace('Bearer ', '');
  const expectedApiKey = process.env.API_KEY;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API key is required. Include X-API-Key header or Authorization: Bearer <key>',
    });
    return;
  }

  if (!expectedApiKey) {
    res.status(500).json({
      success: false,
      error: 'Server configuration error: API key not configured',
    });
    return;
  }

  if (apiKey !== expectedApiKey) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
    return;
  }

  next();
};

// Cache JWKS per process to avoid repeated network calls
let jwksCache: any = null; // will be set to createRemoteJWKSet result

export const authenticateCognito = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('🔐 Cognito authentication middleware called for:', req.method, req.originalUrl);

  // Optional bypass for local development/testing
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    if (!req.user) {
      req.user = {
        sub: 'dev-user',
        email: 'dev@example.com',
        'custom:role': 'admin',
        'cognito:username': 'dev-user',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      } as any;
    }
    console.warn('⚠️ DEV_BYPASS_AUTH enabled – skipping Cognito verification. DO NOT USE IN PRODUCTION.');
    return next();
  }

  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      res.status(401).json({ success: false, error: 'JWT token is required. Include Authorization: Bearer <token>' });
      return;
    }
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'JWT token is required. Include Authorization: Bearer <token>' });
      return;
    }

    // Strip Bearer (also handle cases with duplicated Bearer)
    let token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token.toLowerCase().startsWith('bearer ')) token = token.slice(7).trim();
    if (!token) {
      res.status(401).json({ success: false, error: 'JWT token is required. Include Authorization: Bearer <token>' });
      return;
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const region = process.env.COGNITO_REGION;
    const clientId = process.env.COGNITO_APP_CLIENT_ID; // optional audience check

    if (!userPoolId || !region) {
      res.status(500).json({ success: false, error: 'Server configuration error: Cognito settings not configured' });
      return;
    }

    if (!jwksCache) {
      try {
        // Use dynamic import with proper ESM handling
        const jose: JoseModule = await eval('import("jose")') as JoseModule;
        jwksCache = jose.createRemoteJWKSet(new URL(`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`));
      } catch (e) {
        console.error('❌ Failed to build JWKS client:', e);
        console.error('❌ Dynamic import or JWKS initialization error:', (e as Error)?.name, (e as Error)?.message);
        res.status(500).json({ success: false, error: 'Failed to initialize authentication keys' });
        return;
      }
    }

    let verification: JWTVerifyResult;
    try {
      // Use dynamic import with proper ESM handling
      const jose: JoseModule = await eval('import("jose")') as JoseModule;
      verification = await jose.jwtVerify(token, jwksCache, {
        issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
        audience: clientId || undefined,
      });
    } catch (err: any) {
      const name = err?.name || 'JWTError';
      const message = err?.message || 'Invalid token';
      console.error('❌ JWT verification failed:', name, message);
      console.error('❌ JWT verification error details:', err);
      const expired = name === 'JWTExpired' || /expired/i.test(message);
      res.status(401).json({ success: false, error: expired ? 'Invalid or expired JWT token' : 'Invalid or expired JWT token' });
      return;
    }

    const decoded: any = verification.payload;

    if (decoded?.token_use && decoded.token_use !== 'id') {
      res.status(401).json({ success: false, error: 'Unsupported token type' });
      return;
    }

    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      'custom:role': decoded['custom:role'],
      'cognito:username': decoded['cognito:username'] || decoded['username'] || decoded.sub,
      exp: decoded.exp,
      iat: decoded.iat,
    };
    console.log('✅ Authenticated Cognito user:', req.user['cognito:username']);
    return next();
  } catch (e: any) {
    // Only unexpected infrastructure/runtime errors should reach here
    console.error('❌ Unexpected auth middleware error:', (e as Error)?.name, (e as Error)?.message);
    console.error('❌ Full unexpected error:', e);
    res.status(500).json({ success: false, error: 'Authentication processing error' });
  }
};

export const authorizeRole = (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => {
  const userRole = req.user?.['custom:role'];
  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({ success: false, error: 'Forbidden: insufficient role' });
  }
  return next();
};