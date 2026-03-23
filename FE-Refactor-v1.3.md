# FE-Refactor-v1.3.md: Full-Stack Asset Management Upgrade

## 🛠 Strategic Research & Planning

### 1. Batch Delete Endpoint (Backend Optimization)

Currently, deleting 10 images triggers 10 separate HTTP `DELETE` requests. This is inefficient and risks hitting the `express-rate-limit` you have configured.

- **The Plan:** Create a new route `DELETE /images/batch`.
- **Implementation:** The backend should accept an array of IDs in the request body. It should use `Promise.allSettled()` to attempt all deletions (Cloudinary/Local + MongoDB) simultaneously and return a summary of successes and failures.

### 2. Professional Image Preview (Lightbox)

Production tools rarely just show a grid; they allow users to "inspect" the asset.

- **The Plan:** Instead of just a card, implement a **Modal/Lightbox**.
- **Implementation:** Since you already have the `/images/:id/src` proxy, use it to serve the "Full" version in the modal. Add keyboard listeners (`Esc` to close, `Arrow keys` to navigate) for a premium feel.

### 3. Advanced Sorting & Metadata

To act as a true "Manager," the user needs to organize the data.

- **The Plan:** Add a "Sort By" dropdown (Date, Name, Size).
- **Implementation:** Update the `getFilteredImages()` function in `app.js` to include a `.sort()` method before rendering.

### 4. Virtualized Pagination

If a user uploads 500 images, the browser's DOM will lag.

- **The Plan:** Implement "Infinite Scroll" or "Load More."
- **Implementation:** Update the `GET /images` backend route to support `limit` and `skip` query parameters.

---

## 📝 The "Future Development"

This plan is designed to guide through these specific backend and frontend upgrades.

```markdown
# Role

Senior Full-Stack Developer. Implement Phase 2 of the "Enterprise Asset Manager" refactor focusing on Batch Operations, Advanced Sorting, and UI Modals.

# Task 1: Backend Batch Deletion

- Create `DELETE /images/batch` in `imageRoutes.js`.
- Logic: Accept `{ ids: [] }`. Use `imageService.js` to delete multiple records from MongoDB and their respective storage (Cloudinary/Local).
- Ensure the rate-limit handles this as a single "heavy" operation.

# Task 2: Frontend Sorting & Filtering

- Add a `<select>` dropdown for sorting: "Newest First", "Oldest First", "Name A-Z", "Size".
- Update `public/app.js` to sort the `AppState.images` array based on this selection before calling `renderGallery()`.

# Task 3: Image Preview Modal

- Implement a hidden `div` modal in `index.html`.
- When an image (not the checkbox/delete button) is clicked, show the modal with the image at 80% screen size.
- Include a "Download" button that points to `/images/:id/src`.

# Task 4: Pagination (Limit/Offset)

- Update `GET /images` to accept `page` and `limit` query parameters.
- Default to 12 images per page.
- Add a "Load More" button at the bottom of the gallery that fetches the next set of images and appends them to `AppState.images`.

# Constraints

- Maintain the 'AppState' pattern in `public/app.js`.
- Ensure all new UI elements use the CSS variables defined in `styles.css`.
- Keep the Proxy Endpoint logic for all image sources.
```

---

## 🎨 Visualizing the Next Phase

- **Scalability:** Pagination ensures the app stays fast even with thousands of images.
- **Efficiency:** Batch deletion reduces network overhead significantly.
- **Polished UX:** The Modal and Sorting move it from a "student project" to a tool someone would actually use to manage assets.

**Here is more details into the code for the `batchDelete` service logic to the backend ready**

This new plan, **FE-Refactor-v1.3.md**, integrates the previous successes with the high-level architecture needed for the "Next Steps." It transitions the project from a simple gallery to a data-driven **Enterprise Asset Manager** by adding backend optimizations, advanced UI controls, and performance-focused data handling.

---

## Phase Status: PLANNING & ARCHITECTURE

This document outlines the requirements for implementing batch operations, advanced metadata sorting, and professional UI components.

---

## 📝 Integrated Prompt for Agent: Enterprise Refactor Phase 2

```markdown
# Role

Senior Full-Stack Engineer. Your task is to implement "Phase 2" of the Asset Manager, focusing on backend efficiency, advanced sorting, and a professional "Lightbox" inspection UI.

# 🎯 Objectives

1. Efficiency: Replace multiple DELETE calls with a single Batch Delete endpoint.
2. Organization: Implement client-side sorting and server-side pagination.
3. Inspection: Add a high-resolution Image Modal (Lightbox) for asset review.

# 🛠 Technical Requirements

## 1. Backend: Batch Operations & Pagination (src/)

- **Routes**: Create `DELETE /images/batch` in `imageRoutes.js`.
- **Controller**: In `imageController.js`, handle the batch request. Accept an array of `ids`.
- **Service**: In `imageService.js`, use `Promise.allSettled()` to attempt deletion for all provided IDs across MongoDB and storage (Cloudinary/Local).
- **Pagination**: Update `GET /images` to support `page` and `limit` query parameters for scalable data fetching.

## 2. Frontend: Advanced State & Logic (public/app.js)

- **Batch Integration**: Update `deleteSelectedImages()` to send a single `DELETE` request to `/images/batch` instead of multiple individual calls.
- **Sorting Logic**:
  - Add a `sortMode` to `AppState` (e.g., 'date-desc', 'name-asc', 'size-desc').
  - Update `getFilteredImages()` to sort the local `AppState.images` array based on the selected criteria before rendering.
- **Pagination**: Add a `loadMore()` function to fetch the next page of results and append them to the current gallery.

## 3. Frontend: Professional UI (public/index.html & styles.css)

- **Lightbox Modal**:
  - Create a hidden modal overlay in `index.html`.
  - Implement logic to open this modal when an image thumbnail is clicked (ensure this doesn't trigger if clicking a checkbox or delete button).
  - Use the proxy endpoint `/images/:id/src` for the modal's high-res view.
- **Control Bar**: Add a `<select>` dropdown next to the search bar for the new sorting options.
- **Skeleton Improvements**: Ensure the `renderSkeletons()` function accounts for both Grid and List view layouts.

# ⚠️ Constraints & Compliance

- Maintain the 'AppState' pattern for all state updates.
- Use 'Optimistic UI' for batch deletions: remove all selected cards immediately and roll back only the specific IDs that fail.
- All new UI elements must use existing CSS Variables (e.g., --color-primary, --radius-lg).
```

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
