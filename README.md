# Image Upload API

A production-ready Express.js image upload API with MongoDB storage and Cloudinary cloud storage. Developed from a student project through enterprise-grade enhancements.

## 📚 Version History

| Version                                                                 | Description                                                        | Date      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | --------- |
| [v1.0](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1)       | Basic image upload with Multer + MongoDB                           | Original  |
| [v1.1.x](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1.1)   | Cloudinary integration with local fallback                         | Phase 1   |
| [v1.1.3](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1.1.3) | Enterprise features: batch delete, pagination, lightbox            | Phase 2   |
| [v1.2](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1.2)     | Advanced metadata: size, displayName, sorting                      | Phase 2.1 |
| [main](https://github.com/TVATDCI/Img-upload-with-multer/tree/main)     | Asset Inspector: dimensions, colors, AI metadata, split-view modal | Phase 3   |

---

## Tech Stack

- **Express.js** — Web framework
- **Multer** — File upload middleware
- **Mongoose** — MongoDB ODM
- **Cloudinary** — Cloud image storage (with local fallback)
- **Helmet** — Security headers
- **express-rate-limit** — Upload rate limiting
- **ESLint + Prettier** — Code linting and formatting
- **image-size** — Extract image dimensions
- **colorthief** — Extract dominant colors

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
    "dimensions": { "width": 1920, "height": 1080 },
    "colors": ["#2E4F06", "#152E02", "#3A6604", "#8DAC30", "#7AA403", "#DBE98A"],
    "fileType": "image/jpeg",
    "path": "https://res.cloudinary.com/.../uuid-filename.jpg",
    "publicId": "img-upload/uuid-filename",
    "localPath": null,
    "uploadDate": "2026-03-22T...",
    "user_ip": "::1"
  }
}
```

---

## Features

### Storage

- **Cloudinary** — Primary storage. Images uploaded to cloud via CDN.
- **Local fallback** — If Cloudinary fails, stored locally in `./uploads/`.
- **`localPath` tracking** — MongoDB stores filesystem path for deletion.

### Security

- MIME type validation (image/jpeg, image/png, image/gif, image/webp only)
- File size limit: 200KB
- Filename sanitization with UUID
- Rate limiting: 20 uploads per 15 minutes per IP
- Helmet security headers
- CORS whitelist

### Metadata Extraction (Phase 3)

- **Dimensions**: Width × Height extracted on upload
- **Colors**: 6 dominant colors (hex codes) extracted automatically
- **File Type**: MIME type stored
- Cloudinary uploads get metadata from API
- Local uploads get metadata via `image-size` and `colorthief`

### Frontend (`public/`)

Access at **http://localhost:3001**

- Fetch-based upload (no page reload)
- Success/error messages with auto-hide toasts
- Loading skeleton screens
- Image gallery with Cloudinary/Local badges
- **Bulk delete** - Select multiple, delete at once
- **Search** - By filename, originalName, displayName, tags, storage
- **Sort** - By Date, Name, or Size
- **Load More** - Pagination button
- **Asset Inspector** - Split-view lightbox with metadata sidebar:
  - Info: Display Name, Original Name, Upload Date
  - Technical: Dimensions, File Size, MIME Type
  - Colors: 6 clickable swatches (click to copy hex)
  - Tags: Clickable chips to filter gallery
- **Actions**: Download, Copy Proxy Link, Rename
- **Color swatches** on gallery cards showing image colors
- Keyboard navigation (Esc, Arrow keys)
- Responsive design (mobile-friendly)

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
  dimensions: { width: Number, height: Number },
  tags: [String],         // AI tags (Cloudinary premium)
  colors: [String],       // 6 dominant hex colors
  fileType: String,       // MIME type
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

## Evolution Timeline

### v1.0 - Basic Upload

- Express + Multer + MongoDB
- Local file storage
- Basic HTML form

### v1.1 - Cloudinary Integration

- Cloudinary SDK integration
- Local fallback on failure
- Security: Helmet, rate limiting, CORS
- Modern frontend with fetch API

### v1.1.3 - Enterprise Features

- Batch delete endpoint
- Pagination (Load More)
- Lightbox modal
- Keyboard navigation

### v1.2 - Advanced Metadata

- File size tracking
- Original filename preservation
- Custom display names (renamable)
- Sort by size

### Phase 3 (Current) - Asset Inspector

- **Split-view lightbox** with metadata sidebar
- **Dimensions extraction** on upload
- **6 dominant colors** extracted automatically
- **Color swatches** on gallery cards
- **Clickable tags** for filtering
- **Download, Copy Proxy, Rename** buttons
- Responsive design
- Modal animations

---

## License

MIT
