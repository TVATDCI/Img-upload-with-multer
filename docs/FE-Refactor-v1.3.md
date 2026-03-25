# FE-Refactor-v1.3.md: Enterprise Asset Manager (Phase 2)

## 🛠 Strategic Research & Planning (The "Why")

### 1. Batch Delete Endpoint (Backend Optimization)

- **The Problem:** Deleting 10 images currently triggers 10 separate HTTP requests, risking rate-limit triggers.
- **The Solution:** Create `DELETE /images/batch`. The backend will accept an array of IDs and use `Promise.allSettled()` to attempt deletions across Cloudinary, Local storage, and MongoDB simultaneously, returning a summary of results.

### 2. Professional Image Preview (Lightbox)

- **The Solution:** Implement a Modal/Lightbox for asset inspection.
- **Requirement:** Must use the `/images/:id/src` proxy to serve high-res versions and include keyboard listeners (`Esc` to close, `Arrows` to navigate).

### 3. Advanced Sorting & Metadata

- **The Solution:** Add a "Sort By" dropdown (Date, Name, Size).
- **Requirement:** Update `getFilteredImages()` in `app.js` to perform local sorting on the `AppState.images` array before rendering.

### 4. Virtualized Pagination

- **The Solution:** Implement "Load More" to prevent DOM lag with large collections.
- **Requirement:** Backend `GET /images` must support `limit` and `skip` query parameters.

### 5. Image Display Name (Custom Naming)

- **The Solution:** Allow users to rename images for better display names.
- **Requirement:** Add `displayName` field to Image schema and provide UI to edit it.

---

## ⚖️ Governance Rules (The "How")

### Global Rules

- **No Silent Failures:** Wrap every async operation in `try/catch` with toast feedback.
- **Self-Documenting Code:** Use descriptive naming conventions (e.g., `isProcessingBatch`).

### Workspace Rules

- **Constraint Compliance:** Strictly enforce the **200KB limit** and **MIME validation**.
- **Storage Resilience:** Maintain "Cloudinary with Local Fallback" logic; ensure no orphaned DB records.
- **Accessibility:** All new UI elements must have `aria-label` attributes and managed focus states.
- **Toast Notifications:** Replace `alert()` with a non-blocking notification system.

---

## 🤖 Implementation Status

### ✅ Completed Tasks

#### Backend (src/)

- [x] **Batch Delete Endpoint** - `DELETE /images/batch` with `Promise.allSettled()`
- [x] **Pagination** - `GET /images?page=1&limit=12` with total/hasMore
- [x] **Image Schema Updates** - Added `size`, `originalName`, `displayName` fields
- [x] **Display Name API** - `PATCH /images/:id/displayName` endpoint
- [x] **Lightbox Proxy** - `/images/:id/src` endpoint for serving images

#### Frontend (public/app.js)

- [x] **Batch Delete** - Uses `/images/batch` endpoint with optimistic UI
- [x] **Sorting** - Date, Name (by displayName), Size (by size field)
- [x] **Pagination** - `loadMore()` function with "Load More" button
- [x] **Search** - Searches by filename, originalName, displayName, storage type
- [x] **Lightbox** - Opens on image click, keyboard navigation (Esc, Arrow keys)
- [x] **Bulk Actions Bar** - Shows when images selected, delete selected button
- [x] **Display Name UI** - Pencil button to rename images
- [x] **Checkbox Sync** - Select All syncs properly with filtered images

#### UI (public/)

- [x] **Lightbox Modal** - Hidden by default, shown on image click
- [x] **Sort Dropdown** - Date, Name (A-Z), Size (Largest) options
- [x] **Load More Button** - Only shows when hasMore is true
- [x] **Bulk Actions Bar** - Visible when items selected
- [x] **Image Filename Display** - Shows displayName/publicId below image
- [x] **Rename Button** - Pencil icon to edit displayName
- [x] **Tooltip Fix** - pointer-events added for native tooltips

---

## 🔧 Key Implementation Details

### Image Schema (src/models/Image.js)

```javascript
{
  filename: String,        // System-generated unique filename
  originalName: String,    // Original filename from upload
  displayName: String,     // Custom display name (user-editable)
  path: String,           // Cloudinary URL or local path
  publicId: String,       // Cloudinary public ID
  localPath: String,      // Local file path if not on Cloudinary
  size: Number,           // File size in bytes
  uploadDate: Date,       // Upload timestamp
  user_ip: String         // User IP address
}
```

### API Endpoints

| Method | Endpoint                  | Description                  |
| ------ | ------------------------- | ---------------------------- |
| GET    | `/images?page=1&limit=12` | Paginated image list         |
| GET    | `/images/:id`             | Single image by ID           |
| GET    | `/images/:id/src`         | Image proxy for lightbox     |
| PATCH  | `/images/:id/displayName` | Update display name          |
| DELETE | `/images/:id`             | Delete single image          |
| DELETE | `/images/batch`           | Batch delete multiple images |

### Search Functionality

Searches across:

- `filename` (system-generated)
- `originalName` (uploaded file name)
- `displayName` (custom name)
- Storage type (`cloudinary` / `local`)

---

## 🏗 Known Considerations

1. **Rate Limiting:** Batch endpoint helps avoid `express-rate-limit` triggers
2. **Image Size Field:** Now captured during upload for sorting
3. **Lightbox Proxy:** Must use `/images/:id/src` to avoid CORS issues
4. **Existing Images:** Pre-existing images won't have `size`/`originalName`/`displayName` until re-uploaded
5. **Browser Cache:** Clear cache after updates to get new JS/CSS

---

## Future Roadmap (Phase 3)

- **Image Editing**: Basic cropping or rotation via Cloudinary transformation APIs.
- **User Ownership**: Associating uploads with a `userId` for multi-user support.
- **Folders/Tags**: Implementing a directory structure for better asset categorization.
- **Bulk Rename**: Allow renaming multiple images at once.
- **Image Details Modal**: Show full metadata (size, dimensions, upload date) in lightbox.

---
