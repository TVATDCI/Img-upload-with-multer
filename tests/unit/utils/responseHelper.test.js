import { describe, expect, test } from '@jest/globals';
import {
  badRequest,
  created,
  error,
  forbidden,
  notFound,
  serverError,
  success,
  unauthorized,
} from '../../../src/utils/responseHelper.js';

const createMockRes = () => {
  const res = {
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
  };

  return res;
};

describe('responseHelper', () => {
  test('success returns a 200 envelope with defaults', () => {
    const res = createMockRes();

    success(res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ success: true, message: 'Success', data: null });
  });

  test('created returns a 201 envelope', () => {
    const res = createMockRes();
    const data = { id: '123' };

    created(res, data, 'Saved');

    expect(res.statusCode).toBe(201);
    expect(res.payload).toEqual({ success: true, message: 'Saved', data });
  });

  test.each([
    [badRequest, 400, 'Bad request'],
    [unauthorized, 401, 'Unauthorized'],
    [forbidden, 403, 'Forbidden'],
    [notFound, 404, 'Not found'],
    [serverError, 500, 'Internal server error'],
  ])('%p returns the expected error envelope', (helper, statusCode, defaultMessage) => {
    const res = createMockRes();

    helper(res);

    expect(res.statusCode).toBe(statusCode);
    expect(res.payload).toEqual({ success: false, error: defaultMessage });
  });

  test('error returns a custom status and message', () => {
    const res = createMockRes();

    error(res, 418, 'Teapot');

    expect(res.statusCode).toBe(418);
    expect(res.payload).toEqual({ success: false, error: 'Teapot' });
  });
});
