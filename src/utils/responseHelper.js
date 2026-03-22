export const success = (res, data = null, message = "Success") => {
  return res.status(200).json({ success: true, message, data });
};

export const created = (res, data = null, message = "Created") => {
  return res.status(201).json({ success: true, message, data });
};

export const badRequest = (res, message = "Bad request") => {
  return res.status(400).json({ success: false, error: message });
};

export const notFound = (res, message = "Not found") => {
  return res.status(404).json({ success: false, error: message });
};

export const serverError = (res, message = "Internal server error") => {
  return res.status(500).json({ success: false, error: message });
};

export const error = (res, status, message) => {
  return res.status(status).json({ success: false, error: message });
};
