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

public/                    # Frontend assets
├── index.html            # Frontend HTML structure
├── styles.css            # Frontend styles (separated from HTML)
└── app.js                # Frontend JavaScript (separated from HTML)
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

| HTTP Status | Meaning                           |
| ----------- | --------------------------------- |
| 400         | Bad request (no file, invalid ID) |
| 413         | File too large (max 200KB)        |
| 415         | Invalid file type                 |
| 404         | Image not found                   |
| 429         | Too many uploads (rate limited)   |
| 500         | Server error                      |

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

### Accessing the Refactored Frontend

After starting the server with `npm start`:

- **New Frontend (Recommended)**: <http://localhost:3001>
  - Served from `public/index.html`
  - Features: Message display, delete functionality, state management

- **Old Frontend (Legacy)**: <http://localhost:3001/uploads/../../../index.html> (deprecated)
  - Kept for backward compatibility
  - Will be removed in future versions

### Testing the Message Display Fix

When you upload an image:

1. A **green message** should appear smoothly at the top: "Image uploaded successfully!"
2. It **stays visible for 5 seconds**, then fades out
3. The message uses CSS transitions (not animation jumps)
4. **Browser Console** shows detailed debug logs:

   ```
   [App Initialization] {...}
   [Upload Started] {...}
   [Upload Response] {...}
   [Image Data Received] {...}
   [Notification] {...}
   ```

### Debugging Tips

Open **Developer Tools (F12)** → **Console Tab** to see:

- `[AppState]` logs: State changes
- `[Notification]` logs: Message display events
- `[Upload Started/Response]` logs: Upload progress
- Timestamps for each action

This helps identify exactly where any issues occur if the message still doesn't display.

### Frontend Refactoring Plan

The frontend is being refactored from a single monolithic `index.html` into a modular structure. This improves:

- **Debuggability** — Separate concerns make it easier to identify issues
- **Maintainability** — CSS and JS changes don't require searching through large HTML files
- **Best Practices** — Follows professional web development standards
- **Performance** — Easier to optimize individual files

#### Refactoring Structure

**1. `public/index.html`** — HTML Only

- Clean semantic HTML without inline styles or scripts
- Minimal markup focused on structure
- References to external CSS and JS

**2. `public/styles.css`** — Styling Only

- All CSS rules separated from HTML
- Clean cascade without `!important` flags
- Proper CSS for state management (`.show` class pattern)
- Smooth transitions and animations

**3. `public/app.js`** — JavaScript Only

- All client-side logic in one place
- Event listeners for DOM interactions
- API communication (fetch calls)
- Message display and gallery management
- No inline event handlers

### Technical Implementation Details

**CSS Variables** (`public/styles.css`):

```css
:root {
  --color-primary: #007bff;
  --color-success: #22c55e;
  --color-danger: #ef4444;
  --transition-base: 0.3s ease;
  /* ... and 20+ more variables */
}
```

Benefits: Easy theming, consistent spacing, reusable transitions.

**State Management** (`public/app.js`):

```javascript
const AppState = {
  isLoading: false,
  images: [],
  message: { text: '', type: '' },

  setState(updates) {
    Object.assign(this, updates);
    this.log('State Changed', updates); // Debug logging
  },
};
```

Benefits: Predictable UI updates, centralized data, easy debugging.

**Message Display Fix**:
CSS transition: `height: 0 → auto` + `opacity: 0 → 1` instead of display.
Result: Smooth animation, no CSS conflicts, works reliably.

## Frontend

The frontend has been refactored from a single `index.html` into separate files for better maintainability:

- **`public/index.html`** — HTML structure and layout
- **`public/styles.css`** — All styling (previously inline `<style>`)
- **`public/app.js`** — All JavaScript logic (previously inline `<script>`)

### Features

- Fetch-based upload (no page reload)
- Success/error messages with 5s auto-hide
- Live image gallery from `GET /images`
- Upload button disabled during upload

### Frontend Fixes Applied (Resolution of Previous Issues)

**Issue #1 - File Deletion Bug (Backend) ✅ FIXED**

- [src/controllers/imageController.js](src/controllers/imageController.js) — Changed to pass `localFilePath` instead of absolute path
- [src/services/imageService.js](src/services/imageService.js) — Now constructs proper URL paths:
  - If Cloudinary succeeds: Uses Cloudinary CDN URL
  - If Cloudinary fails: Uses `/uploads/{filename}` for local file serving
- Impact: Images now display correctly in the gallery

**Issue #2 - Gallery Not Refreshing ✅ FIXED**

- Added explicit `loadImages()` call after successful upload
- Enhanced error handling with HTTP status checking
- Added console logging for debugging

**Issue #3 - Message Not Displaying ✅ FIXED**

- **Root Cause**: CSS cascade issues with `display: none/block` and multiple inline styles
- **Solution**: Refactored frontend into modular structure with clean separation of concerns
- **Implementation**:
  - `public/index.html` — Semantic HTML only, no inline styles/scripts
  - `public/styles.css` — CSS variables, no `!important` flags, smooth transitions
  - `public/app.js` — JavaScript with state management and debug logging
  - Uses `height: 0 → auto` with `opacity: 0 → 1` for smooth message visibility

**Issue #4 - Delete Functionality ✅ IMPLEMENTED**

- Each image has a "Delete" button in the gallery
- Confirmation dialog prevents accidental deletion
- Optimistic UI: Card removed immediately, restored if delete fails
- Handles both successful deletes and 404 errors (image already gone)

### State Management & Debugging

The refactored `public/app.js` includes:

- **AppState Object** — Centralized state for UI consistency
- **Debug Logging** — Every action logged to browser console with timestamps
- **Error Boundaries** — Try-catch blocks for resilient error handling
- **DOM Initialization** — Ensures all elements are ready before event binding
- **DOMContentLoaded Event** — Guarantees script runs after HTML is parsed

## Original Student Tasks

This project started as a student exercise. The tasks below were the learning objectives:

1. Install npm packages: express, mongoose, multer, cors
2. Configure Multer with `./uploads` destination and 200KB file limit
3. Create a `/uploadImage` endpoint with Multer middleware
4. Test basic image upload
5. Create an Image schema with filename, path, uploadDate, user_ip
6. Save image metadata to MongoDB on upload
