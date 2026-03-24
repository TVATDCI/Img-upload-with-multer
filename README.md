# Image Upload API

A production-ready Express.js image upload API with MongoDB storage and Cloudinary cloud storage. Developed from a student project through enterprise-grade enhancements.

## 📚 Version History

| Version                                                                 | Description                                             | Date     |
| ----------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| [v1.0](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1)       | Basic image upload with Multer + MongoDB                | Original |
| [v1.1.x](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1.1)   | Cloudinary integration with local fallback              | Phase 1  |
| [v1.1.3](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1.1.3) | Enterprise features: batch delete, pagination, lightbox | Phase 2  |
| [main](https://github.com/TVATDCI/Img-upload-with-multer/tree/main)     | Advanced metadata: size, displayName, sorting           | Current  |

---

## Tech Stack

- **Express.js** — Web framework
- **Multer** — File upload middleware
- **Mongoose** — MongoDB ODM
- **Cloudinary** — Cloud image storage (with local fallback)
- **Helmet** — Security headers
- **express-rate-limit** — Upload rate limiting
- **ESLint + Prettier** — Code linting and formatting

---

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
│   ├── index.js           # Route aggregator
│   └── imageRoutes.js     # API route definitions
├── middlewares/
│   ├── upload.js          # Multer configuration
│   ├── errorHandler.js    # Global error handler
│   └── multerError.js     # Multer error mapper
└── utils/
    ├── fileUtils.js       # File cleanup helpers
    └── responseHelper.js  # Standardized API responses

public/                    # Frontend (served at /)
├── index.html            # HTML structure
├── styles.css            # Styles with CSS variables
└── app.js               # JavaScript with AppState management

server.js                 # Entry point
app.js                    # Express app setup
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable                | Description                                   |
| ----------------------- | --------------------------------------------- |
| `MONGO_URI`             | MongoDB connection string (local or Atlas)    |
| `PORT`                  | Server port (default: 3001)                   |
| `UPLOADS_FOLDER`        | Local upload directory (default: `./uploads`) |
| `ALLOWED_ORIGINS`       | CORS allowed origins (comma-separated)        |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                         |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                            |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                         |

### 3. Start the server

```bash
npm start
```

---

## API Endpoints

| Method | Endpoint                  | Description                  |
| ------ | ------------------------- | ---------------------------- |
| POST   | `/uploadImage`            | Upload an image (max 200KB)  |
| GET    | `/images?page=1&limit=12` | Paginated image list         |
| GET    | `/images/:id`             | Single image by ID           |
| GET    | `/images/:id/src`         | Image proxy for lightbox     |
| PATCH  | `/images/:id/displayName` | Update display name          |
| DELETE | `/images/:id`             | Delete single image          |
| DELETE | `/images/batch`           | Batch delete multiple images |

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
    "originalName": "my-photo.jpg",
    "displayName": "My Vacation Photo",
    "size": 154200,
    "path": "https://res.cloudinary.com/.../uuid-filename.jpg",
    "publicId": "img-upload/uuid-filename",
    "localPath": null,
    "uploadDate": "2026-03-22T...",
    "user_ip": "::1"
  }
}
```

### `GET /images?page=1&limit=12`

Paginated image list with metadata.

**Response:**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 50,
      "totalPages": 5,
      "hasMore": true
    }
  }
}
```

### `DELETE /images/batch`

Batch delete multiple images in one request.

**Request:**

```json
{
  "ids": ["id1", "id2", "id3"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "3 of 3 images deleted",
  "data": {
    "total": 3,
    "succeeded": ["id1", "id2", "id3"],
    "failed": []
  }
}
```

---

## Error Responses

| HTTP Status | Meaning                           |
| ----------- | --------------------------------- |
| 400         | Bad request (no file, invalid ID) |
| 413         | File too large (max 200KB)        |
| 415         | Invalid file type                 |
| 404         | Image not found                   |
| 429         | Too many uploads (rate limited)   |
| 500         | Server error                      |

---

## Features

### Storage

- **Cloudinary** — Primary storage. Images are uploaded to Cloudinary and served via CDN.
- **Local fallback** — If Cloudinary upload fails, the image is stored locally in `./uploads/` and served at `/uploads/filename`.
- **`localPath` tracking** — MongoDB stores the filesystem path for local files so deletion works correctly.

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

### Frontend (`public/`)

Access at **http://localhost:3001**

- Fetch-based upload (no page reload)
- Success/error messages with auto-hide (green/red toasts)
- Loading skeleton screens while fetching images
- Image gallery with Cloudinary/Local badge per image
- **Delete button** with confirmation dialog
- **Bulk delete** - Select multiple images and delete at once
- **Search** - Filter by filename, originalName, displayName, or storage type
- **Sort** - By Date (newest), Name (A-Z), or Size (largest)
- **Load More** - Pagination button for large galleries
- **Lightbox** - Click image to open full-size preview with keyboard navigation (Esc, Arrow keys)
- **Rename** - Custom display names for images (pencil icon)
- **Select All** - Bulk select/deselect with checkbox
- Client-side validation: file size (max 200KB) and MIME type
- Accessibility: `aria-label` on all interactive elements
- Images served through `/images/:id/src` proxy (works around CDN blocking)

---

## Image Schema

```javascript
{
  filename: String,        // System-generated unique filename
  originalName: String,   // Original filename from upload
  displayName: String,    // Custom display name (user-editable)
  path: String,           // Cloudinary URL or local path
  publicId: String,       // Cloudinary public ID
  localPath: String,      // Local file path if not on Cloudinary
  size: Number,           // File size in bytes
  uploadDate: Date,       // Upload timestamp
  user_ip: String         // User IP address
}
```

---

## Development

```bash
npm start        # Start server
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
```

---

## Original Student Tasks (v1.0)

This project started as a student exercise:

1. Install npm packages: express, mongoose, multer, cors
2. Configure Multer with `./uploads` destination and 200KB file limit
3. Create a `/uploadImage` endpoint with Multer middleware
4. Test basic image upload
5. Create an Image schema with filename, path, uploadDate, user_ip
6. Save image metadata to MongoDB on upload

---

## Evolution Timeline

### v1.0 - Basic Upload

- Simple Express + Multer + MongoDB setup
- Local file storage only
- Basic HTML form

### v1.1 - Cloudinary Integration

- Added Cloudinary SDK integration
- Images uploaded to cloud by default
- Local fallback if cloud fails
- Added security: Helmet, rate limiting, CORS
- Modernized frontend with fetch API

### v1.1.3 - Enterprise Features

- Batch delete endpoint (single API call for multiple deletes)
- Pagination (Load More button)
- Lightbox modal for image preview
- Keyboard navigation (Esc, Arrows)
- Optimistic UI for better UX

### Current (main) - Advanced Metadata

- File size tracking for sorting
- Original filename preservation
- Custom display names (renamable)
- Enhanced search (by display name)
- Sort by size option
- Bulk actions bar
- Checkbox sync improvements

---

## License

MIT
