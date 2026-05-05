import multer from 'multer';
import { describe, expect, jest, test } from '@jest/globals';
import { multerErrorHandler } from '../../../src/middlewares/multerError.js';

const createMockRes = () => ({
  statusCode: null,
  payload: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.payload = body;
    return this;
  },
});

describe('multerErrorHandler', () => {
  test('maps known multer file size errors', () => {
    const res = createMockRes();
    const next = jest.fn();

    multerErrorHandler(new multer.MulterError('LIMIT_FILE_SIZE'), {}, res, next);

    expect(res.statusCode).toBe(413);
    expect(res.payload).toEqual({
      success: false,
      error: 'File too large. Maximum size is 200KB.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('falls back to the multer error message for unknown codes', () => {
    const res = createMockRes();
    const next = jest.fn();
    const err = new multer.MulterError('LIMIT_PART_COUNT', 'Too many parts');
    err.message = 'Too many parts';

    multerErrorHandler(err, {}, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, error: 'Too many parts' });
  });

  test('passes non-multer errors to next', () => {
    const res = createMockRes();
    const next = jest.fn();
    const err = new Error('boom');

    multerErrorHandler(err, {}, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.statusCode).toBeNull();
  });
});
