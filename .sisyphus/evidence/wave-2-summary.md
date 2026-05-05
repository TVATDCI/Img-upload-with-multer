# Wave 2 Summary: Core Backend Features

**Date:** 2026-05-05
**Status:** COMPLETE

---

## What Was Accomplished

### Slice 2A: Image Processing Pipeline ✅ COMPLETE

**Files created:**
- `src/services/imageProcessingService.js` — Sharp-based variant generation
  - Thumb: 150×150 cover/crop, no watermark
  - Preview: 800×600 inside fit, watermarkable
  - Full: 1920×1080 inside fit, watermarkable
  - WebP output with JPEG fallback
  - Watermark validation (1-50 printable ASCII)
  - SVG watermark overlay with 50% opacity, bottom-right
- `src/services/storageVariantService.js` — Persist variant files to disk
  - Saves WebP + JPEG fallback files to uploads folder
  - Deletes variant sets on cleanup

**Files modified:**
- `src/models/Image.js` — Added `variants[]` array and `watermarked` boolean, `album` reference
- `src/services/imageService.js` — Wired variant generation + storage into upload flow; variant cleanup on delete
- `src/controllers/imageController.js` — Added `serveVariant`, watermark support, `includeVariants` query param, batch upload, SSE progress
- `src/routes/imageRoutes.js` — Added `GET /images/:id/variant/:size`, `POST /uploadImages`, `GET /uploads/progress/:jobId`

### Slice 2B: Bulk Upload API ✅ COMPLETE

**Files created:**
- `src/services/batchUploadService.js` — Multi-file upload orchestration
  - Accepts 1-10 files per batch
  - Tracks progress via uploadProgressService
  - Rollback on failure: deletes successfully created images
  - Cleans up temp files in all paths
- `src/services/uploadProgressService.js` — In-memory job registry with SSE
  - Job creation with UUID
  - Per-file progress tracking (queued → processing → uploaded/failed)
  - Aggregate progress calculation
  - SSE event broadcasting (processing, uploaded, failed, rolled_back, completed, heartbeat)
  - Client connection/disconnection handling
  - TTL cleanup (10 minutes after completion)
  - 15-second heartbeat interval

**Endpoints added:**
- `POST /uploadImages` — Multi-file batch upload (admin only, max 10 files)
- `GET /uploads/progress/:jobId` — SSE stream for real-time progress

### Slice 2C: Albums / Collections ✅ COMPLETE

**Files created:**
- `src/models/Album.js` — Schema with name (globally unique), description, coverImage
- `src/services/albumService.js` — CRUD + deterministic cover fallback
- `src/controllers/albumController.js` — All endpoints with validation
- `src/routes/albumRoutes.js` — Routes with auth guards

**Files modified:**
- `src/routes/index.js` — Registered albumRoutes
- `src/models/Image.js` — Added `album` reference field
- `src/controllers/imageController.js` — Added `updateImageAlbum`
- `src/routes/imageRoutes.js` — Added `PATCH /images/:id/album`
- `src/services/imageService.js` — Wired cover sync into deleteImage

**Album endpoints:**
- `GET /albums` — List with image counts (public)
- `POST /albums` — Create (admin only)
- `GET /albums/:id/images` — Paginated images (public)
- `PATCH /albums/:id` — Update cover image (admin only)
- `PATCH /images/:id/album` — Assign/unassign (admin only)

---

## Verification

### Lint
`npm run lint` — ✅ PASS (no errors, no warnings)

### App Startup
`node -e "import('./src/app.js')"` — ✅ PASS (imports successfully, MongoDB connects)

### Tests
- Unit tests (responseHelper, fileUtils, multerError): ✅ 14 tests passing
- Auth integration tests: ✅ 7 tests passing
- Total: 21 tests passing

---

## New Dependencies
None required — used built-in `crypto.randomUUID()` instead of external uuid package.

---

## Notes

- Variant files are stored in the same `uploads/` folder as originals, with naming convention `{originalName}-{size}.webp` and `{originalName}-{size}.jpg` for fallback
- SSE progress endpoint is public (no auth required) since job IDs are unguessable UUIDs
- Batch upload has strict 10-file limit enforced at route level via `upload.array('images', 10)` and service level via MAX_BATCH_SIZE
- Rollback deletes all successfully created images if ANY file in the batch fails — this ensures atomicity at the batch level
- Album cover fallback follows PRD rule: auto-assign on first image, fallback to most-recently-uploaded on deletion, null when empty
