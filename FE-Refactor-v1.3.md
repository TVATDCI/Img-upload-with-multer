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

## 🤖 Integrated Prompt for Agent: Enterprise Refactor Phase 2

# Role

Senior Full-Stack Engineer. You are implementing Phase 2 of the Asset Manager refactor.

# Task 1: Backend Efficiency (src/)

- **Batch Route:** Create `DELETE /images/batch` in `imageRoutes.js`.
- **Controller/Service:** Handle an array of `ids`. Use `Promise.allSettled()` to clean up Cloudinary/Local storage and MongoDB records.
- **Pagination:** Update `GET /images` to handle `page` and `limit` parameters (default: 12 per page).

# Task 2: Advanced Frontend Logic (public/app.js)

- **Batch Integration:** Update `deleteSelectedImages()` to call the new `/batch` endpoint.
- **Sorting:** Add `sortMode` to `AppState`. Update `getFilteredImages()` to sort by date, name, or size.
- **Pagination:** Add `loadMore()` to fetch the next set of images and append them to `AppState.images`.
- **Validation:** Add client-side size (200KB) and type checks before upload.

# Task 3: Professional UI (public/index.html & styles.css)

- **Lightbox Modal:** Create a hidden modal in `index.html`. Trigger it when a thumbnail is clicked (but not when clicking checkboxes). Use the proxy endpoint for the source.
- **Control Bar:** Add a `<select>` dropdown for sorting next to the search bar.
- **Toast System:** Implement a UI-friendly toast notification for success/error messages.

# ⚠️ Constraints & Compliance

- Maintain the 'AppState' pattern and use CSS Variables.
- Use 'Optimistic UI' for batch deletions: remove cards immediately and only roll back if the server fails.
- All code must pass ESLint and maintain storage fallback resilience.

# Task 3: Professional UI (public/index.html & styles.css)

- **Lightbox Modal:** Create a hidden modal in `index.html`. Trigger it when a thumbnail is clicked (but not when clicking checkboxes). Use the proxy endpoint for the source.
- **Control Bar:** Add a `<select>` dropdown for sorting next to the search bar.
- **Toast System:** Implement a UI-friendly toast notification for success/error messages.

# ⚠️ Constraints & Compliance

- Maintain the 'AppState' pattern and use CSS Variables.
- Use 'Optimistic UI' for batch deletions: remove cards immediately and only roll back if the server fails.
- All code must pass ESLint and maintain storage fallback resilience.

---

## 🏗 Key Implementation Details for Debugging

### 1. Batch Deletion Performance

The backend should be audited to ensure that `express-rate-limit` is not triggered by a single batch request containing many IDs. We will verify that the server returns a 207 Multi-Status or a summary object if some deletions fail while others succeed.

### 2. Image Proxy & Modal UX

Since Cloudinary URLs can be blocked by certain environments, the Modal must strictly use the `/images/:id/src` endpoint.

### 3. DOM Virtualization vs. Simple Pagination

For this phase, we are using a "Load More" button to keep the `public/app.js` logic clean. In the debugging phase, we will check if appending large sets of images causes layout shifts (CLS) and if the **Skeleton Screens** effectively mask the loading state of new pages.

---

## Future Roadmap (Phase 3)

- **Image Editing**: Basic cropping or rotation via Cloudinary transformation APIs.
- **User Ownership**: Associating uploads with a `userId` for multi-user support.
- **Folders/Tags**: Implementing a directory structure for better asset categorization.
