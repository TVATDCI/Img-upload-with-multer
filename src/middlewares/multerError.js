import multer from 'multer';
import { error } from '../utils/responseHelper.js';

const MULTER_ERROR_MAP = {
  LIMIT_FILE_SIZE: { status: 413, message: 'File too large. Maximum size is 200KB.' },
  LIMIT_FILE_COUNT: { status: 400, message: 'Too many files. Maximum is 1 file.' },
  LIMIT_UNEXPECTED_FILE: { status: 400, message: 'Unexpected file field.' },
  LIMIT_FILE_TYPE: { status: 415, message: 'Invalid file type.' },
};

export const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const mapped = MULTER_ERROR_MAP[err.code] || {
      status: 400,
      message: err.message,
    };
    return error(res, mapped.status, mapped.message);
  }
  next(err);
};
