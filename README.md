# Image Upload API

A production-ready Express.js image upload API with MongoDB storage and Cloudinary cloud storage.

## Tech Stack

- **Express.js** — Web framework
- **Multer** — File upload middleware
- **Mongoose** — MongoDB ODM
- **Cloudinary** — Cloud image storage (with local fallback)
- **Helmet** — Security headers
- **express-rate-limit** — Upload rate limiting
- **ESLint + Prettier** — Code linting and formatting

## Project Structure

```
src/
├── config/
│   ├── index.js           # Environment config (centralized)
│   └── database.js        # MongoDB connection
├── controllers/
│   └── imageController.js # HTTP request/response handlers
├── services/
│   ├── imageService.js    # Business logic (DB + file operations)
│   └── cloudinaryService.js # Cloudinary upload/delete
├── models/
│   └── Image.js           # Mongoose schema
├── routes/
│   ├── index.js            # Route aggregator
│   └── imageRoutes.js      # API route definitions
├── middlewares/
│   ├── upload.js          # Multer configuration
│   ├── errorHandler.js    # Global error handler
│   └── multerError.js     # Multer error mapper
└── utils/
    ├── fileUtils.js       # File cleanup helpers
    └── responseHelper.js  # Standardized API responses
app.js                     # Express app setup
server.js                  # Entry point
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string (local or Atlas) |
| `PORT` | Server port (default: 3001) |
| `UPLOADS_FOLDER` | Local upload directory (default: `./uploads`) |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### 3. Start the server

```bash
npm start
```

## API Endpoints

### `POST /uploadImage`

Upload an image. Supports JPEG, PNG, GIF, WebP. Max size: **200KB**.

**Response:**

```json
{
  "success": true,
  "message": "Image uploaded successfully!",
  "data": {
    "_id": "...",
    "filename": "uuid-filename.jpg",
    "path": "https://res.cloudinary.com/.../uuid-filename.jpg",
    "publicId": "img-upload/uuid-filename",
    "uploadDate": "2026-03-22T...",
    "user_ip": "::1"
  }
}
```

### `GET /images`

List all uploaded images, sorted newest first.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "filename": "uuid-filename.jpg",
      "path": "https://res.cloudinary.com/.../uuid-filename.jpg",
      "publicId": "img-upload/uuid-filename",
      "uploadDate": "2026-03-22T...",
      "user_ip": "::1"
    }
  ]
}
```

### `GET /images/:id`

Get a single image by ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "filename": "uuid-filename.jpg",
    "path": "https://res.cloudinary.com/...",
    "publicId": "img-upload/uuid-filename",
    "uploadDate": "2026-03-22T...",
    "user_ip": "::1"
  }
}
```

### `DELETE /images/:id`

Delete an image. Removes from Cloudinary (if uploaded) or local disk, then from MongoDB.

**Response:**

```json
{
  "success": true,
  "message": "Image deleted successfully!",
  "data": null
}
```

## Error Responses

All errors return a consistent format:

```json
{
  "success": false,
  "error": "Error description"
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request (no file, invalid ID) |
| 413 | File too large (max 200KB) |
| 415 | Invalid file type |
| 404 | Image not found |
| 429 | Too many uploads (rate limited) |
| 500 | Server error |

## Features

### Storage

- **Cloudinary** — Primary storage. Images are uploaded to Cloudinary and served via CDN.
- **Local fallback** — If Cloudinary upload fails, the image is stored locally in `./uploads/`.

### Security

- MIME type validation (image/jpeg, image/png, image/gif, image/webp only)
- File size limit: 200KB
- Filename sanitization with UUID
- Rate limiting: 20 uploads per 15 minutes per IP
- Helmet security headers
- CORS whitelist (configurable via `ALLOWED_ORIGINS`)

### Error Handling

- Multer errors mapped to appropriate HTTP status codes
- Global error handler for consistent JSON responses
- Orphaned file cleanup if database save fails

## Development

```bash
npm start        # Start server
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
```

## Original Student Tasks

This project started as a student exercise. The tasks below were the learning objectives:

1. Install npm packages: express, mongoose, multer, cors
2. Configure Multer with `./uploads` destination and 200KB file limit
3. Create a `/uploadImage` endpoint with Multer middleware
4. Test basic image upload
5. Create an Image schema with filename, path, uploadDate, user_ip
6. Save image metadata to MongoDB on upload
