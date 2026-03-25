import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/User.js';
import { unauthorized, forbidden } from '../utils/responseHelper.js';
import { env } from '../config/index.js';

/**
 * Middleware to protect routes and ensure the user is authenticated.
 * Extracts the JWT from the cookie, verifies it, and attaches the user to the request.
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Get token from cookies
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token || token === 'loggedout') {
      return unauthorized(res, 'You are not logged in! Please login to get access.');
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = await promisify(jwt.verify)(token, env.jwt.secret);
    } catch (err) {
      return unauthorized(res, 'Invalid or expired token. Please login again.');
    }

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return unauthorized(res, 'The user belonging to this token no longer exists.');
    }

    // 4. Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to restrict access to specific roles (e.g., 'admin').
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return forbidden(res, 'You do not have permission to perform this action.');
    }
    next();
  };
};
