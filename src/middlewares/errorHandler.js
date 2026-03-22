import { serverError, error } from '../utils/responseHelper.js';

export const errorHandler = (err, req, res, _next) => {
  console.error(err.stack);

  if (err.name === 'MulterError') {
    return error(res, 400, err.message);
  }

  if (err.name === 'CastError') {
    return error(res, 400, 'Invalid ID format');
  }

  return serverError(res);
};
