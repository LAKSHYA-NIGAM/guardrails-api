import { generateToken, extractToken } from '../middleware/auth.js';
import User from '../models/User.js';
import { ValidationException, NotFoundException } from '../middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || '3e72eb2e8e1294d10b7ecf80f470503f7f0d42ad30c86a42135d089e';

/**
 * Register a new user account
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const { username, password, isPremium } = req.body;

    if (!username || !username.trim()) {
      throw new ValidationException('Username is required');
    }

    if (!password || password.length < 4) {
      throw new ValidationException('Password must be at least 4 characters long');
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) {
      throw new ValidationException(`Username '${username}' is already taken`);
    }

    const user = new User({
      username: username.trim(),
      password,
      isPremium: Boolean(isPremium)
    });

    await user.save();

    const token = generateToken({
      id: user.id,
      username: user.username,
      isPremium: user.isPremium
    });

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        isPremium: user.isPremium
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login with username and password
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ValidationException('Username and password are required');
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(401).json({
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Invalid username or password',
        timestamp: new Date().toISOString()
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Invalid username or password',
        timestamp: new Date().toISOString()
      });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      isPremium: user.isPremium
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      token,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        isPremium: user.isPremium
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Issue token directly (utility/API token)
 * POST /api/auth/token
 */
export async function issueToken(req, res, next) {
  try {
    const { username, id, isPremium } = req.body;

    let userPayload = { id: id || 1, username: username || 'lakshya', isPremium: Boolean(isPremium) };

    if (username) {
      const existing = await User.findOne({ username });
      if (existing) {
        userPayload = {
          id: existing.id,
          username: existing.username,
          isPremium: existing.isPremium
        };
      }
    }

    const token = generateToken(userPayload);

    return res.status(200).json({
      token,
      tokenType: 'Bearer',
      expiresIn: '7d',
      user: userPayload
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current authenticated user details
 * GET /api/auth/me
 */
export async function getCurrentUser(req, res) {
  if (!req.user) {
    return res.status(401).json({
      status: 401,
      error: 'UNAUTHORIZED',
      message: 'Not authenticated',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({
    authenticated: true,
    user: req.user
  });
}

/**
 * Verify token endpoint
 * POST /api/auth/verify
 */
export async function verifyTokenEndpoint(req, res) {
  const token = req.body.token || extractToken(req);
  if (!token) {
    return res.status(400).json({ valid: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ valid: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ valid: false, message: err.message });
  }
}
