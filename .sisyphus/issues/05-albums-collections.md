# Issue 05: Albums / Collections

**Title:** Add album lifecycle, image assignment, and filtered gallery browsing

**Type:** AFK
**Estimated Effort:** medium
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 5

---

## Description

This slice introduces first-class album organization for images. Admins can create albums with descriptive metadata, assign images to albums, and browse the gallery filtered by collection. Albums expose image counts and cover images with deterministic fallback rules. All existing image retrieval contracts remain backwards-compatible.

The slice covers three user stories:
- **US-5.1:** Album lifecycle management (create, list, unique name enforcement)
- **US-5.2:** Image-to-album assignment and clearing
- **US-5.3:** Album filtered browsing with automatic cover image fallback

---

## Acceptance Criteria

- [ ] `POST /albums` creates an album with validated `name` (required, 1-100 chars, trimmed) and optional `description` (max 500 chars).
- [ ] Album `name` is globally unique across the system; duplicate names return `409 Conflict` with error message `"Album name already exists"`.
- [ ] `GET /albums` returns album metadata plus image counts and cover image ID.
- [ ] `PATCH /images/:id/album` assigns or clears an album reference for an image.
- [ ] Assignment rejects invalid album IDs and nonexistent image IDs with stable error responses.
- [ ] Existing image retrieval endpoints continue to return image data even when no album is assigned.
- [ ] `GET /albums/:id/images` returns paginated images for the requested album.
- [ ] The frontend can filter the gallery by album and return to the unfiltered gallery without a full-page reload.
- [ ] Album cover image behavior follows the deterministic fallback rule:
  - [ ] On album creation, `coverImage` is `null`.
  - [ ] When the first image is assigned, `coverImage` automatically becomes that image's ID.
  - [ ] When the current `coverImage` is deleted or unassigned, fallback to the most recently uploaded remaining image (by `uploadDate` descending); if none remain, `coverImage` becomes `null`.
  - [ ] Admin can explicitly set `coverImage` via `PATCH /albums/:id` with `{ coverImage: imageId }`.
  - [ ] `GET /albums` always returns `coverImage` as either an image ID or `null`; never a broken reference.
- [ ] New `Album` model and album routes have unit and integration test coverage.
- [ ] Existing gallery and image endpoints pass regression tests with albums absent.

---

## Blockers

- **Issue 01** (Testing Infrastructure) — album model, routes, and services need the test harness, mocks, and fixture utilities established in Slice 1.

---

## Vertical Slice Justification

This slice spans backend (album model, routes, cover fallback logic), data model extensions (`Album` schema, `Image.album` reference), frontend (album filter UI, album selector in upload flow), and verification (unit + integration tests). It produces working album creation, assignment, and filtered browsing — an end-to-end feature, not a backend-only layer.
