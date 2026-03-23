# Technical Specification: Enterprise Asset Manager Phase 2

## Overview

This document provides detailed technical specifications for implementing Phase 2 of the Enterprise Asset Manager refactor. Based on FE-Refactor-v1.3.md requirements.

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
        succeeded: results.succeeded.length,
        failed: results.failed.length,
        details: results.results,
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

**Location:** `src/routes/imageRoutes.js` - Already present, needs update

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

---

## 2. Frontend Logic (public/app.js)

### 2.1 Updated AppState

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
  // Lightbox state
  lightboxImage: null,
  lightboxIndex: 0,

  setState(updates) {
    Object.assign(this, updates);
  },
};
```

### 2.2 Updated deleteSelectedImages()

```javascript
async function deleteSelectedImages() {
  const ids = [...AppState.selectedIds];
  if (ids.length === 0) return;

  if (!window.confirm(`Delete ${ids.length} selected image(s)? This cannot be undone.`)) return;

  // Optimistic UI: immediately hide cards
  const cards = ids.map((id) => document.getElementById(`img-${id}`)).filter(Boolean);
  cards.forEach((card) => {
    card.style.opacity = '0.5';
    card.style.transform = 'scale(0.95)';
  });

  try {
    const res = await fetch(`${API}images/batch`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    const data = await res.json();

    if (res.ok && data.data) {
      // Remove successfully deleted images from state
      const succeededIds = data.data.succeeded;
      AppState.images = AppState.images.filter((img) => !succeededIds.includes(img._id));
      AppState.selectedIds = [];

      renderGallery(getFilteredImages());
      updateBulkActionsBar();

      if (data.data.failed.length > 0) {
        showMessage(
          `${data.data.succeeded.length} deleted, ${data.data.failed.length} failed.`,
          'warning'
        );
      } else {
        showMessage(`${succeededIds.length} image(s) deleted.`, 'success', 3000);
      }
    } else {
      // Rollback: restore card visibility
      cards.forEach((card) => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      });
      showMessage(data.error || 'Batch delete failed.', 'error');
    }
  } catch (err) {
    // Rollback on network error
    cards.forEach((card) => {
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });
    showMessage('Network error during batch delete.', 'error');
  }
}
```

### 2.3 Sorting Implementation

```javascript
function getFilteredImages() {
  let images = AppState.images;

  // Apply search filter
  const query = AppState.searchQuery.toLowerCase().trim();
  if (query) {
    images = images.filter((img) => {
      const filename = img.filename || '';
      const isCloudinary = img.path && img.path.includes('cloudinary.com');
      const storageType = isCloudinary ? 'cloudinary' : 'local';
      return filename.toLowerCase().includes(query) || storageType.includes(query);
    });
  }

  // Apply sorting
  images = [...images].sort((a, b) => {
    switch (AppState.sortMode) {
      case 'name':
        return (a.filename || '').localeCompare(b.filename || '');
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

### 2.4 Load More / Pagination

```javascript
async function loadMore() {
  if (AppState.pagination.hasMore === false || AppState.isLoading) return;

  AppState.setState({ isLoading: true });

  try {
    const nextPage = AppState.pagination.page + 1;
    const res = await fetch(`${API}images?page=${nextPage}&limit=${AppState.pagination.limit}`);
    const data = await res.json();

    if (res.ok && data.data) {
      AppState.setState({
        images: [...AppState.images, ...data.data.data],
        pagination: {
          ...AppState.pagination,
          page: nextPage,
          total: data.data.pagination.total,
          hasMore: data.data.pagination.hasMore,
        },
      });
      renderGallery(getFilteredImages());
    }
  } catch (err) {
    showMessage('Failed to load more images.', 'error');
  } finally {
    AppState.setState({ isLoading: false });
  }
}
```

### 2.5 Lightbox Modal Implementation

```javascript
// Lightbox state
let lightboxVisible = false;
let currentImageIndex = 0;

function openLightbox(imageId) {
  const images = getFilteredImages();
  currentImageIndex = images.findIndex((img) => img._id === imageId);

  if (currentImageIndex === -1) return;

  const image = images[currentImageIndex];
  const modal = document.getElementById('lightbox-modal');
  const modalImg = document.getElementById('lightbox-image');

  modalImg.src = `/images/${image._id}/src`;
  modal.style.display = 'flex';
  lightboxVisible = true;

  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  modal.style.display = 'none';
  lightboxVisible = false;
  document.body.style.overflow = '';
}

function navigateLightbox(direction) {
  const images = getFilteredImages();
  currentImageIndex = (currentImageIndex + direction + images.length) % images.length;

  const image = images[currentImageIndex];
  const modalImg = document.getElementById('lightbox-image');
  modalImg.src = `/images/${image._id}/src`;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!lightboxVisible) return;

  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

// Click handler update (exclude checkbox clicks)
imageGallery.addEventListener('click', (e) => {
  const checkbox = e.target.closest('.img-checkbox');
  if (checkbox) return; // Skip checkbox clicks

  const card = e.target.closest('.image-card');
  if (card && !e.target.closest('.btn-delete')) {
    const imageId = card.id.replace('img-', '');
    openLightbox(imageId);
  }
});
```

---

## 3. UI Components (public/index.html)

### 3.1 Added Elements

```html
<!-- Sort Dropdown -->
<div class="gallery-controls">
  <input
    type="text"
    id="search-input"
    class="search-input"
    placeholder="Search..."
    aria-label="Search images"
  />

  <select id="sort-select" class="sort-select" aria-label="Sort images">
    <option value="date">Date (Newest)</option>
    <option value="name">Name (A-Z)</option>
    <option value="size">Size (Largest)</option>
  </select>

  <button id="view-toggle" class="btn-toggle">Switch to List View</button>
</div>

<!-- Load More Button -->
<div id="load-more-container" class="load-more-container">
  <button id="load-more-btn" class="btn-load-more">Load More</button>
</div>

<!-- Lightbox Modal -->
<div
  id="lightbox-modal"
  class="lightbox-modal"
  role="dialog"
  aria-modal="true"
  aria-label="Image preview"
>
  <button id="lightbox-close" class="lightbox-close" aria-label="Close">&times;</button>
  <button id="lightbox-prev" class="lightbox-nav lightbox-prev" aria-label="Previous image">
    &larr;
  </button>
  <img id="lightbox-image" class="lightbox-image" src="" alt="Full size image" />
  <button id="lightbox-next" class="lightbox-nav lightbox-next" aria-label="Next image">
    &rarr;
  </button>
</div>

<!-- Toast Container -->
<div id="toast-container" class="toast-container"></div>
```

---

## 4. Styling (public/styles.css)

### 4.1 Sort Select

```css
.sort-select {
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--color-white);
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}
```

### 4.2 Load More Button

```css
.load-more-container {
  text-align: center;
  margin: 24px 0;
}

.btn-load-more {
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  padding: 12px 32px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background var(--transition-fast);
}

.btn-load-more:hover {
  background: var(--color-primary-hover);
}

.btn-load-more:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

### 4.3 Lightbox Modal

```css
.lightbox-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

.lightbox-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 30px;
  font-size: 40px;
  color: white;
  background: none;
  border: none;
  cursor: pointer;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  color: white;
  background: none;
  border: none;
  cursor: pointer;
  padding: 20px;
}

.lightbox-prev {
  left: 20px;
}
.lightbox-next {
  right: 20px;
}
```

### 4.4 Toast Notifications

```css
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  padding: 14px 20px;
  border-radius: var(--radius-md);
  color: var(--color-white);
  font-weight: 500;
  box-shadow: var(--shadow-card);
  animation: toast-slide-in 0.3s ease;
}

.toast.success {
  background: var(--color-success);
}
.toast.error {
  background: var(--color-danger);
}
.toast.warning {
  background: #f59e0b;
}

@keyframes toast-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

## 5. Governance Compliance Checklist

- [x] **No Silent Failures:** All async operations wrapped in try/catch with toast feedback
- [x] **Self-Documenting Code:** Descriptive naming (`isProcessingBatch`, `loadMore`)
- [x] **200KB Limit:** Client-side validation already exists in Phase 1
- [x] **Storage Resilience:** Cloudinary with Local Fallback maintained
- [x] **Accessibility:** All new UI elements have aria-labels and focus states
- [x] **Toast Notifications:** Replaces alert() system
- [x] **Optimistic UI:** Batch deletions hide cards immediately, rollback on failure
- [x] **ESLint Compliance:** Code follows project linting rules
- [x] **AppState Pattern:** Maintained throughout implementation
- [x] **CSS Variables:** Uses existing `--color-*` variables

---

## 6. Implementation Order

1. **Backend First:**
   - Add pagination to `getImages` (controller + service)
   - Add batch delete endpoint (route + controller + service)

2. **Frontend Logic:**
   - Update AppState with new properties
   - Implement sorting in `getFilteredImages()`
   - Update `deleteSelectedImages()` for batch endpoint
   - Implement `loadMore()` for pagination

3. **UI Components:**
   - Add HTML elements (sort dropdown, load more, lightbox, toast container)
   - Add CSS styles
   - Wire up event listeners

4. **Testing:**
   - Test batch delete with multiple images
   - Test pagination (load more button)
   - Test sorting (all three modes)
   - Test lightbox (open, close, keyboard nav)

---

## 7. Known Considerations

1. **Rate Limiting:** The batch endpoint should help avoid triggering `express-rate-limit` when deleting many images
2. **Image Size Field:** The Image model doesn't currently have a `size` field. Either add it to schema or use filename as proxy for sorting
3. **Lightbox Proxy:** Must use `/images/:id/src` endpoint to avoid CORS issues with direct Cloudinary URLs
4. **Empty State:** When all images deleted, ensure "Empty State" message displays properly with skeleton screens

---

_Specification created for FE-Refactor-v1.3.md Phase 2 Implementation_
