# Technical Specification: Asset Inspector & Intelligence (Phase 3)

## Overview

This document provides the definitive technical specification for Phase 3 of the Image Upload API. It expands upon the foundational features of Phase 2 by adding rich metadata extraction, an interactive Asset Inspector, and AI-driven data enrichment.

---

## ✅ Implementation Status (Phase 3)

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Metadata Extraction** | ✅ Complete | Dimensions, 6 Colors, MIME Type, Size |
| **Cloudinary Integration** | ✅ Complete | Extracts metadata via API (`colors: true`) |
| **Local Fallback Extraction** | ✅ Complete | Uses `image-size` and `colorthief` |
| **Asset Inspector UI** | ✅ Complete | Dual-pane split-view lightbox with sidebar |
| **Smart Filtering** | ✅ Complete | Search by Tags, Hex Colors, Storage, Name |
| **Optimistic Rename** | ✅ Complete | UI updates before server confirmation |
| **Proxy Rendering** | ✅ Complete | Consistent image delivery via `/images/:id/src` |
| **Mobile Responsive** | ✅ Complete | Sidebar stacks below image on smaller screens |

---

## 1. Data Schema & Persistence (src/models/Image.js)

The Mongoose schema has been enriched to support professional Asset Management:

```javascript
{
  filename: String,        // System-generated unique filename
  originalName: String,    // Original filename from upload
  displayName: String,     // User-editable label
  path: String,            // Public URL (Cloudinary) or Relative Path (Local)
  publicId: String,        // Cloudinary Public ID
  localPath: String,       // Full path to local storage if Cloudinary fails
  size: Number,            // File size in bytes
  dimensions: {            // NEW: Image dimensions
    width: Number,
    height: Number
  },
  tags: [String],          // NEW: AI-generated tags (Cloudinary)
  colors: [String],        // NEW: 6 dominant hex color codes
  fileType: String,        // NEW: MIME type (e.g., image/jpeg)
  uploadDate: Date,        // ISO Timestamp
  user_ip: String          // Tracking uploader IP
}
```

---

## 2. Intelligence Pipeline (src/services/imageService.js)

The metadata extraction follows a tiered strategy to ensure data richness regardless of storage location.

### 2.1 Cloudinary Intelligence
When Cloudinary is the primary storage, we request metadata directly from their API:
- **Colors**: Enabled via `colors: true` in the upload options.
- **Dimensions**: Extracted from the API response object (`width`, `height`).
- **Format**: Converted to MIME type string.

### 2.2 Local Intelligence Fallback
If the system falls back to local storage, we use specialized libraries:
- **`image-size`**: Reads the file buffer to extract `width` and `height`.
- **`colorthief`**: Analyzes the image to extract a 6-color palette (converted to Hex).

```javascript
async function extractLocalMetadata(localFilePath) {
  // 1. Extract dimensions via image-size
  // 2. Extract 6 colors via colorthief (format: 'hex')
  // 3. Map to internal schema
}
```

---

## 3. Asset Inspector UI (public/app.js)

The Lightbox has been refactored into a professional **Asset Inspector**.

### 3.1 Split-View Architecture
- **Preview Pane (Left)**: Renders the image using the `/images/:id/src` proxy. Includes navigation controls (Next/Prev) and keyboard listener support (Arrows, Esc).
- **Metadata Sidebar (Right)**:
    - **Info Section**: Display Name, Original Name, Upload Date.
    - **Technical Section**: Dimensions (Px), File Size (KB/MB), MIME Type.
    - **Colors Section**: 6 clickable swatches. Clicking a swatch copies the Hex code to the clipboard.
    - **Tags Section**: Interactive chips. Clicking a tag closes the inspector and filters the gallery by that tag.

### 3.2 Action Logic
- **Download**: Triggers a programmatic `<a>` click for the proxy source.
- **Copy Proxy**: Copies the absolute URL of the backend proxy to the clipboard.
- **Rename**: Integrates with the optimistic UI rename handler.

---

## 4. Search & Filtering Implementation

The `getFilteredImages()` function has been updated to support the new metadata:

- **Tag Search**: Searches within the `tags[]` array.
- **Color Search**: Searches for partial hex code matches.
- **Storage Search**: Filters by "local" or "cloudinary".
- **Semantic Match**: If a user clicks a tag chip, the search query is automatically updated to that tag.

---

## 5. Security & Constraints

- **Size Limit**: 200KB limit enforced via Multer and frontend validation.
- **MIME Whitelist**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- **Proxy Constraint**: All full-size previews *must* go through the proxy to ensure access control and bypass CORS restrictions.
- **State Management**: All UI updates must synchronize with the `AppState` object.

---
*Technical Specification Updated: March 24, 2026*
