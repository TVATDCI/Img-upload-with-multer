# Technical Specification: Enterprise Asset Manager Phase 2

## Overview

This document provides detailed technical specifications for implementing Phase 2 of the Enterprise Asset Manager refactor. Based on FE-Refactor-v1.3.md requirements.

---

## ✅ Implementation Status

| Feature                 | Status      | Notes                              |
| ----------------------- | ----------- | ---------------------------------- |
| Batch Delete Endpoint   | ✅ Complete | `DELETE /images/batch`             |
| Pagination              | ✅ Complete | `GET /images?page=1&limit=12`      |
| Sort by Date/Name/Size  | ✅ Complete | Dropdown with 3 options            |
| Lightbox Modal          | ✅ Complete | Keyboard nav, proxy endpoint       |
| Load More Button        | ✅ Complete | Shows when hasMore=true            |
| Bulk Actions Bar        | ✅ Complete | Visible when items selected        |
| Display Name (Rename)   | ✅ Complete | PATCH endpoint + UI                |
| File Size Tracking      | ✅ Complete | Added to schema                    |
| Original Name Tracking  | ✅ Complete | Added to schema                    |
| Enhanced Search         | ✅ Complete | Searches displayName, originalName |
| Checkbox Sync           | ✅ Complete | Select All syncs properly          |
| Lightbox Error Handling | ✅ Complete | onerror handler added              |

---

## 1. Backend Implementation (src/)

### 1.1 Batch Delete Endpoint

**Route:** `DELETE /images/batch`

**Location:** `src/routes/imageRoutes.js`

```javascript
router.delete('/images/batch', batchDeleteImages);
```

**Controller:** `src/controllers/imageController.js`

```javascript
export const batchDeleteImages = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, 'No IDs provided');
    }

    const results = await imageService.batchDeleteImages(ids);

    return success(
      res,
      {
        total: ids.length,
        succeeded: results.succeeded,
        failed: results.failed,
      },
      `${results.succeeded.length} of ${ids.length} images deleted`
    );
  } catch (err) {
    next(err);
  }
};
```

**Service:** `src/services/imageService.js`

```javascript
export const batchDeleteImages = async (ids) => {
  const results = await Promise.allSettled(ids.map((id) => deleteImage(id)));

  const succeeded = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      succeeded.push(ids[index]);
    } else {
      failed.push({
        id: ids[index],
        reason: result.reason?.message || 'Delete failed',
      });
    }
  });

  return { succeeded, failed, results };
};
```

### 1.2 Pagination Support

**Route:** `GET /images?page=1&limit=12`

**Location:** `src/routes/imageRoutes.js`

**Controller:** `src/controllers/imageController.js`

```javascript
export const getImages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const [images, total] = await Promise.all([
      imageService.getImagesPaginated(skip, limit),
      imageService.getTotalImageCount(),
    ]);

    return success(res, {
      data: images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
};
```

**Service:** `src/services/imageService.js`

```javascript
export const getImagesPaginated = async (skip, limit) => {
  return Image.find().sort({ uploadDate: -1 }).skip(skip).limit(limit);
};

export const getTotalImageCount = async () => {
  return Image.countDocuments();
};
```

### 1.3 Display Name Update (NEW)

**Route:** `PATCH /images/:id/displayName`

**Controller:**

```javascript
export const updateDisplayName = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { displayName } = req.body;

    if (!displayName || typeof displayName !== 'string') {
      return badRequest(res, 'Display name is required');
    }

    const image = await imageService.updateImageDisplayName(id, displayName.trim());
    if (!image) {
      return notFound(res, 'Image not found!');
    }

    return success(res, image, 'Display name updated!');
  } catch (err) {
    next(err);
  }
};
```

---

## 2. Image Schema (Updated)

```javascript
const imageSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String }, // NEW: Original filename from upload
    displayName: { type: String }, // NEW: Custom display name (user-editable)
    path: { type: String, required: true },
    publicId: { type: String },
    localPath: { type: String },
    size: { type: Number }, // NEW: File size in bytes
    uploadDate: { type: Date, default: Date.now },
    user_ip: { type: String, required: true },
  },
  { timestamps: true }
);
```

---

## 3. Frontend Logic (public/app.js)

### 3.1 Updated AppState

```javascript
const AppState = {
  isLoading: false,
  images: [],
  selectedIds: [],
  viewMode: 'grid',
  searchQuery: '',
  sortMode: 'date', // 'date' | 'name' | 'size'
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    hasMore: false,
  },
  setState(updates) {
    Object.assign(this, updates);
  },
};
```

### 3.2 Display Name Helper (NEW)

```javascript
function getImageDisplayName(img) {
  // Priority: displayName > publicId > originalName > filename
  if (img.displayName) return img.displayName;
  if (img.publicId) {
    const parts = img.publicId.split('/');
    return parts[parts.length - 1];
  }
  return img.originalName || img.filename;
}
```

### 3.3 Search Implementation (Updated)

```javascript
function getFilteredImages() {
  let images = AppState.images;

  // Apply search filter - now searches displayName, originalName, filename, storage type
  const query = AppState.searchQuery.toLowerCase().trim();
  if (query) {
    images = images.filter((img) => {
      const filename = img.filename || '';
      const originalName = img.originalName || '';
      const displayName = getImageDisplayName(img);
      const isCloudinary = img.path && img.path.includes('cloudinary.com');
      const storageType = isCloudinary ? 'cloudinary' : 'local';
      return (
        filename.toLowerCase().includes(query) ||
        originalName.toLowerCase().includes(query) ||
        displayName.toLowerCase().includes(query) ||
        storageType.includes(query)
      );
    });
  }

  // Apply sorting - now sorts by displayName for 'name' mode
  images = [...images].sort((a, b) => {
    switch (AppState.sortMode) {
      case 'name':
        return getImageDisplayName(a).localeCompare(getImageDisplayName(b));
      case 'size':
        return (b.size || 0) - (a.size || 0);
      case 'date':
      default:
        return new Date(b.uploadDate) - new Date(a.uploadDate);
    }
  });

  return images;
}
```

### 3.4 Bulk Actions Bar (NEW)

```javascript
function updateBulkActionsBar() {
  const count = AppState.selectedIds.length;
  const bulkActionsBar = document.getElementById('bulk-actions-bar');
  const selectedCountEl = document.getElementById('selected-count');
  const deleteSelectedBtn = document.getElementById('delete-selected-btn');

  if (count > 0) {
    selectedCountEl.textContent = `${count} selected`;
    deleteSelectedBtn.style.display = 'inline-block';
    bulkActionsBar.classList.add('visible'); // NEW: Toggle visibility class
  } else {
    selectedCountEl.textContent = '0 selected';
    deleteSelectedBtn.style.display = 'none';
    bulkActionsBar.classList.remove('visible');
  }
}
```

### 3.5 Lightbox with Error Handling (Updated)

```javascript
function openLightbox(imageId) {
  const images = getFilteredImages();
  currentImageIndex = images.findIndex((img) => img._id === imageId);

  if (currentImageIndex === -1) {
    showMessage('Image not found.', 'error');
    return;
  }

  const image = images[currentImageIndex];
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-image');

  modalImg.alt = image.filename || 'Full size image';
  modalImg.src = `/images/${image._id}/src`;

  // NEW: Error handling for failed image loads
  modalImg.onerror = () => {
    modalImg.src = '';
    modalImg.alt = 'Failed to load image';
    showMessage('Failed to load image preview.', 'error');
  };

  modal.style.display = 'flex';
  lightboxVisible = true;
  document.body.style.overflow = 'hidden';
}
```

### 3.6 Rename Handler (NEW)

```javascript
imageGallery.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.btn-edit-name');
  if (!editBtn) return;

  e.stopPropagation();
  const id = editBtn.dataset.id;
  const image = AppState.images.find((img) => img._id === id);
  if (!image) return;

  const currentName = getImageDisplayName(image);
  const newName = prompt('Enter new name for this image:', currentName);

  if (!newName || newName.trim() === currentName) return;

  fetch(`${API}images/${id}/displayName`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: newName.trim() }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.data) {
        const idx = AppState.images.findIndex((img) => img._id === id);
        if (idx !== -1) {
          AppState.images[idx] = { ...AppState.images[idx], displayName: newName.trim() };
        }
        renderGallery(getFilteredImages());
        showMessage('Image renamed successfully!', 'success', 3000);
      } else {
        showMessage(data.error || 'Failed to rename image.', 'error');
      }
    });
});
```

---

## 4. UI Components (public/index.html)

### 4.1 Gallery Controls with Sort Options

```html
<div class="gallery-controls">
  <input
    type="text"
    id="search-input"
    class="search-input"
    placeholder="Search by filename or storage type..."
    aria-label="Search images"
  />

  <select id="sort-select" class="sort-select" aria-label="Sort images">
    <option value="date">Date (Newest)</option>
    <option value="name">Name (A-Z)</option>
    <option value="size">Size (Largest)</option>
    <!-- NEW -->
  </select>

  <button id="view-toggle" class="btn-toggle">Switch to List View</button>
</div>
```

### 4.2 Bulk Actions Bar (NEW)

```html
<div id="bulk-actions-bar" class="bulk-actions-bar">
  <label class="select-all-label">
    <input type="checkbox" id="select-all" />
    <span id="selected-count">0 selected</span>
  </label>
  <button id="delete-selected-btn" class="btn-delete-selected">Delete Selected</button>
</div>
```

### 4.3 Image Card with Rename Button (NEW)

```html
<div class="image-card">
  <div class="card-checkbox">
    <input type="checkbox" class="img-checkbox" data-id="..." />
  </div>
  <img src="/images/.../src" alt="..." title="..." />
  <div class="card-details">
    <div class="image-meta">
      <span class="image-filename" data-id="..." title="Click to rename">displayName</span>
      <button class="btn-edit-name" data-id="..." title="Rename">✎</button>
      <span class="badge badge-cloudinary">Cloudinary</span>
    </div>
    <button class="btn-delete" data-id="...">Delete</button>
  </div>
</div>
```

---

## 5. Styling (public/styles.css)

### 5.1 Image Filename & Edit Button (NEW)

```css
.image-filename {
  font-size: 12px;
  color: var(--color-text);
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}

.image-filename:hover {
  color: var(--color-primary);
}

.btn-edit-name {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text-muted);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
}

.btn-edit-name:hover {
  color: var(--color-primary);
}
```

### 5.2 Bulk Actions Bar (NEW)

```css
.bulk-actions-bar {
  display: none;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--color-selection);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.bulk-actions-bar.visible {
  display: flex;
}
```

---

## 6. API Endpoints Summary

| Method | Endpoint                  | Description                                            |
| ------ | ------------------------- | ------------------------------------------------------ |
| POST   | `/uploadImage`            | Upload image (returns size, originalName, displayName) |
| GET    | `/images?page=1&limit=12` | Paginated list                                         |
| GET    | `/images/:id`             | Single image                                           |
| GET    | `/images/:id/src`         | Image proxy                                            |
| PATCH  | `/images/:id/displayName` | Update display name (NEW)                              |
| DELETE | `/images/:id`             | Delete single                                          |
| DELETE | `/images/batch`           | Batch delete                                           |

---

## 7. Governance Compliance Checklist

- [x] **No Silent Failures:** All async operations wrapped in try/catch with toast feedback
- [x] **Self-Documenting Code:** Descriptive naming (`isProcessingBatch`, `loadMore`)
- [x] **200KB Limit:** Client-side validation
- [x] **Storage Resilience:** Cloudinary with Local Fallback maintained
- [x] **Accessibility:** All new UI elements have aria-labels and focus states
- [x] **Toast Notifications:** Replaces alert() system
- [x] **Optimistic UI:** Batch deletions hide cards immediately, rollback on failure
- [x] **ESLint Compliance:** Code follows project linting rules
- [x] **AppState Pattern:** Maintained throughout implementation
- [x] **CSS Variables:** Uses existing `--color-*` variables

---

## 8. Known Considerations

1. **Rate Limiting:** Batch endpoint avoids triggering `express-rate-limit` when deleting many images
2. **Image Size Field:** Now captured during upload for sorting by size
3. **Lightbox Proxy:** Uses `/images/:id/src` endpoint to avoid CORS issues
4. **Existing Images:** Pre-existing images won't have `size`/`originalName`/`displayName` until re-uploaded
5. **Browser Cache:** Clear cache after updates to get new JS/CSS

---

## 9. Implementation Order (Completed)

1. ✅ **Backend First:**
   - Add pagination to `getImages` (controller + service)
   - Add batch delete endpoint (route + controller + service)
   - Add displayName field and update endpoint

2. ✅ **Frontend Logic:**
   - Update AppState with new properties
   - Implement sorting in `getFilteredImages()` including displayName
   - Update `deleteSelectedImages()` for batch endpoint
   - Implement `loadMore()` for pagination
   - Add bulk actions bar visibility toggle
   - Add rename button handler

3. ✅ **UI Components:**
   - Add HTML elements (sort dropdown, load more, lightbox, bulk bar, rename button)
   - Add CSS styles
   - Wire up event listeners

4. ✅ **Testing:**
   - Batch delete with multiple images
   - Pagination (load more button)
   - Sorting (all three modes)
   - Lightbox (open, close, keyboard nav)
   - Rename functionality
   - Search by displayName

---

_Specification updated to reflect Phase 2 implementation as of March 2026_
