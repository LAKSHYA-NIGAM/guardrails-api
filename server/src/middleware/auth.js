import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'guardrails_super_secret_jwt_key_2026';

/**
 * Generate a JWT token for a user or service
 * @param {Object} payload 
 * @param {string} expiresIn 
 * @returns {string}
 */
export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Extract token from request headers
 * @param {Object} req 
 * @returns {string|null}
 */
export function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.headers['x-access-token']) {
    return req.headers['x-access-token'];
  }
  if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

/**
 * Required JWT verification middleware
 */
export function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      status: 401,
      error: 'UNAUTHORIZED',
      message: 'Access denied: No JWT token provided in Authorization header (Bearer <token>)',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 401,
      error: 'UNAUTHORIZED',
      message: `Invalid or expired JWT token: ${err.message}`,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Optional JWT verification middleware (attaches req.user if token is present)
 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    console.debug('[Auth] Optional token invalid:', err.message);
  }

  next();
}

export default { generateToken, requireAuth, optionalAuth, extractToken };
