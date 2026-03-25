import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { success, badRequest, unauthorized, error } from '../utils/responseHelper.js';
import { env } from '../config/index.js';

const parseJwtExpiresIn = (expiresIn) => {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};

const signToken = (id) => {
  return jwt.sign({ id }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const jwtDuration = parseJwtExpiresIn(env.jwt.expiresIn);

  const cookieOptions = {
    expires: new Date(Date.now() + jwtDuration),
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'Strict',
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  return res.status(statusCode).json({
    success: true,
    data: {
      user,
    },
  });
};

/**
 * Log a user in using email and password.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Check if email and password exist
    if (!email || !password) {
      return badRequest(res, 'Please provide email and password');
    }

    // 2. Check if user exists & password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return unauthorized(res, 'Incorrect email or password');
    }

    // 3. If everything is ok, send token to client
    return createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Clear the authentication cookie.
 */
export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
    sameSite: 'Strict',
  });
  return success(res, null, 'Logged out successfully');
};

/**
 * Returns the current user's information if authenticated.
 */
export const getMe = (req, res) => {
  if (!req.user) {
    return unauthorized(res, 'Not logged in');
  }
  return success(res, { user: req.user });
};
