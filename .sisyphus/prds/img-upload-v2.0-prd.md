# Product Requirements Document: Img-upload-with-multer v2.0

**Initiative:** Img-upload-with-multer v2.0  
**Date:** 2026-05-05  
**Source Brief:** `.sisyphus/notepads/img-upload-v2.0/discovery-2026-05-05.md`  
**Status:** Drafted for review

---

## Problem Statement

Img-upload-with-multer v1.4.1 is production-ready for authenticated single-image upload, metadata extraction, gallery browsing, and portfolio-safe admin controls, but it is blocked from safe expansion by one critical gap: **there is no automated test suite**. The current product also stops at single-file workflows, forcing admins to upload one asset at a time, manage images outside album structures, and rely on a vanilla interface that lacks drag-and-drop batch handling, bulk progress visibility, and processed delivery variants.

The v2.0 initiative must turn the current API into a disciplined digital asset management platform without breaking existing v1.4.1 behavior. The release must preserve the current Express MVC architecture, JWT + RBAC flow, Cloudinary-primary/local-fallback storage strategy, proxy-based full-image serving, and existing API contracts while adding testing infrastructure, an image processing pipeline, transactional bulk uploads, a modern drag-and-drop workflow, and albums/collections.

### Desired Outcome

Deliver a v2.0 release that lets admins safely upload and organize batches of images, retrieve processed variants, assign assets to albums, and operate with confidence because core behaviors are covered by unit, integration, and end-to-end tests.

---

## Solution Overview

v2.0 will add five major capabilities as vertical slices that each span backend, frontend, and verification work where applicable.

1. **Testing Infrastructure**  
   Establish Jest + Supertest for backend unit/integration coverage and Playwright for frontend end-to-end checks, replacing the current failing `npm test` placeholder with repeatable CI-ready quality gates.

2. **Image Processing Pipeline**  
   Generate deterministic image variants (`thumb`, `preview`, `full`) using Sharp, emit WebP derivatives, support optional text watermarking, and expose processed assets through a new variant endpoint while preserving original storage behavior.

3. **Bulk Upload API**  
   Accept up to 10 files per request, track upload progress through SSE, enforce bounded concurrency against Cloudinary and local processing, and guarantee rollback/cleanup when a batch fails mid-flight.

4. **Drag-and-Drop Frontend**  
   Upgrade the current vanilla JS upload flow into a batch-first experience with drag-and-drop selection, preview queue, per-file and aggregate progress bars, album assignment on upload, and bulk operations that retain the current AppState pattern.

5. **Albums / Collections**  
   Add first-class album organization for images, including album creation, gallery filtering, cover-image support, per-album image counts, and assignment workflows that do not break existing image retrieval contracts.

### Release Principles

- Preserve all existing v1.4.1 endpoints, status codes, and response envelopes.
- Keep full-size rendering behind `GET /images/:id/src`.
- Extend, not replace, the Controller-Service-Model architecture.
- Prefer explicit failure modes and cleanup guarantees over best-effort behavior.
- Use testing infrastructure as the enabling slice for all later feature work.

---

## User Stories

User stories are grouped by **vertical slice**. Each story is testable and includes concrete acceptance criteria.

### Slice 1: Testing Infrastructure

#### US-1.1 Backend utility coverage
**As a maintainer, I want automated unit tests for shared helpers and middleware, so that low-level regressions are caught before feature work lands.**

**Acceptance Criteria**
- `npm test` executes unit tests for `responseHelper`, `fileUtils`, and `multerError` and exits with code `0`.
- Test cases cover success and failure branches for each target module.
- Coverage output includes a readable summary for `src/utils/` and `src/middlewares/`.

#### US-1.2 API regression coverage
**As a maintainer, I want integration tests for existing auth and image endpoints, so that v2.0 can preserve v1.4.1 contracts while new features are added.**

**Acceptance Criteria**
- Supertest covers `POST /auth/login`, `POST /auth/logout`, `GET /auth/getMe`, `GET /images`, `GET /images/:id`, and `GET /images/:id/src`.
- Tests assert existing response envelope shape (`success`, `data`, `error`) and expected status codes.
- Cloudinary behavior is mockable so tests pass without real credentials.

#### US-1.3 Frontend smoke protection
**As a maintainer, I want Playwright end-to-end coverage for the public gallery and admin authentication flow, so that the SPA remains usable while batch features are introduced.**

**Acceptance Criteria**
- Playwright can run headlessly in CI against a seeded local environment.
- E2E coverage includes guest gallery view, admin login, and at least one authorized asset-management action.
- Failure output includes screenshots or traces for debugging.

### Slice 2: Image Processing Pipeline

#### US-2.1 Variant generation on upload
**As an admin, I want uploaded images to produce consistent derivative variants, so that the gallery can load fit-for-purpose assets without recomputing transforms on demand.**

**Variant Contract**

| Variant | Max Dimensions | Fit Rule | Format | Quality | Use Case |
|---------|---------------|----------|--------|---------|----------|
| `thumb` | 150×150 px | Cover/center crop | WebP (fallback JPEG) | 80 | Gallery thumbnails, grid views |
| `preview` | 800×600 px | Inside/contain | WebP (fallback JPEG) | 85 | Lightbox preview, detail view |
| `full` | 1920×1080 px | Inside/contain (upscale disabled) | WebP (fallback JPEG) | 90 | Full-size display, max bounded by original |

**Rules**
- Original images smaller than a variant's max dimensions are preserved at original size (no upscale).
- Aspect ratio is preserved via `fit: 'inside'` for `preview`/`full`, and `fit: 'cover'` for `thumb` with `position: 'center'`.
- All variants are stored as WebP with JPEG fallback when the original is not WebP-compatible.
- Variant metadata is stored in `Image.variants[]` with fields: `size`, `width`, `height`, `format`, `path`, `publicId`, `createdAt`.

**Variant Metadata Exposure Contract**
- `GET /images` (list): does NOT include `variants` field by default (preserves existing response size)
- `GET /images` (list): supports optional `?includeVariants=true` query to include `variants` array
- `GET /images/:id` (detail): includes `variants` array with all generated variants
- `GET /images/:id/src` (proxy): unchanged — serves original/canonical image only
- `GET /images/:id/variant/:size` (new): serves specific variant or `404`

**Acceptance Criteria**
- Every successful upload creates `thumb`, `preview`, and `full` variants for supported MIME types.
- Each variant records width, height, format, and storage location in persistence.
- Variant dimensions comply with the contract above; original asset metadata remains available and unchanged for existing consumers.
- `GET /images/:id/variant/:size` returns `404` for unknown sizes and serves the correct variant for valid sizes.
- `GET /images` list endpoint remains backwards-compatible (no `variants` field unless explicitly requested).
- `GET /images/:id` detail endpoint includes `variants` array.

#### US-2.2 WebP derivative delivery
**As a gallery viewer, I want optimized WebP variants when available, so that image browsing is faster without changing existing image proxy behavior.**

**Acceptance Criteria**
- The processing pipeline creates WebP derivatives for each generated size.
- `GET /images/:id/variant/:size` returns the stored asset for a valid size and `404` for an unknown image or missing variant.
- Existing `GET /images/:id/src` behavior remains unchanged and still resolves the canonical full-size image.

#### US-2.3 Optional watermarking
**As an admin, I want to optionally apply a text watermark during upload, so that selected assets can be protected without affecting default uploads.**

**Watermark Request Contract**
- Field name: `watermark` (optional, sent as form field alongside image file)
- Type: string
- Constraints: 1-50 characters, printable ASCII only (no control chars)
- Default: disabled (field omitted or empty string)
- Placement: bottom-right corner of `full` and `preview` variants only (not `thumb`)
- Style: white text with 50% opacity, 24px font size, 10px padding from edges
- Validation failure: returns `400 Bad Request` with message `"Invalid watermark: must be 1-50 printable characters"`

**Acceptance Criteria**
- Watermarking is opt-in per upload request and defaults to disabled.
- Valid watermark text is applied to `full` and `preview` variants; `thumb` variants remain unwatermarked.
- Invalid watermark input returns `400 Bad Request` without creating partial database state.
- Watermarked and non-watermarked uploads can coexist in storage and metadata.
- `GET /images/:id` includes `watermarked: true/false` flag in response.

### Slice 3: Bulk Upload API

#### US-3.1 Multi-file batch submission
**As an admin, I want to upload up to 10 images in one request, so that asset ingestion is efficient for real gallery workflows.**

**Acceptance Criteria**
- `POST /uploadImages` accepts `multipart/form-data` with 1-10 files and rejects 0 files or more than 10 with a `400` response.
- Default per-file size limit remains 200KB unless explicitly reconfigured.
- Existing `POST /uploadImage` continues to work unchanged.

#### US-3.2 Progress tracking via SSE
**As an admin, I want real-time progress updates for a batch upload, so that I can understand whether files are queued, processing, uploaded, rolled back, or complete.**

**SSE Event Contract**

**Endpoint**: `GET /uploads/progress/:jobId`  
**Content-Type**: `text/event-stream`

**Event Types**:

| Event | Fields | Description |
|-------|--------|-------------|
| `queued` | `jobId`, `totalFiles`, `timestamp` | Batch accepted, files queued for processing |
| `processing` | `jobId`, `fileIndex`, `filename`, `status: 'processing'` | Individual file started processing |
| `uploaded` | `jobId`, `fileIndex`, `filename`, `imageId`, `status: 'uploaded'` | Individual file completed successfully |
| `failed` | `jobId`, `fileIndex`, `filename`, `error`, `status: 'failed'` | Individual file failed with error message |
| `rolled_back` | `jobId`, `filesRolledBack`, `status: 'rolled_back'` | Partial batch was rolled back |
| `completed` | `jobId`, `succeeded`, `failed`, `total`, `status: 'completed'` | All files finished (success or failure) |
| `heartbeat` | `jobId`, `timestamp` | Keep-alive ping every 15 seconds |

**Per-File Progress Fields**:
```json
{
  "jobId": "uuid",
  "fileIndex": 0,
  "filename": "photo.jpg",
  "progressPercent": 45,
  "status": "processing",
  "message": "Uploading to Cloudinary"
}
```

**Aggregate Progress Fields**:
```json
{
  "jobId": "uuid",
  "totalFiles": 5,
  "completedFiles": 3,
  "failedFiles": 0,
  "overallPercent": 60,
  "status": "processing"
}
```

**Terminal States & Cleanup**:
- Stream auto-closes on `completed`, `rolled_back`, or after 5 minutes of inactivity.
- Completed jobs are retained in memory for 10 minutes, then TTL cleanup removes them.
- Reconnecting clients receive the current aggregate state, then per-file deltas.

**Deployment Constraint**: The in-memory progress registry is process-local. Progress state is lost on server restart. This is acceptable for v2.0; a future upgrade may introduce Redis-backed persistence.

**Acceptance Criteria**
- Each batch upload returns a `jobId` that can be consumed by `/uploads/progress/:jobId`.
- SSE events comply with the contract above, including all event types and fields.
- Progress stream closes automatically on terminal states and on server-defined timeout/cleanup.
- Reconnecting clients receive the current state without replaying all historical events.

#### US-3.3 Transactional rollback and cleanup
**As a maintainer, I want failed batches to roll back partially persisted work, so that storage and database records never diverge after a partial error.**

**Acceptance Criteria**
- If any file in a batch fails after processing begins, created DB records and uploaded assets from that job are deleted or marked cleanly rolled back before the request is finalized.
- Local temporary files are removed in both success and failure paths.
- When MongoDB transactions are unavailable, the system uses a documented compensating-action fallback and surfaces the mode in logs.

### Slice 4: Drag-and-Drop Frontend

#### US-4.1 Drag-and-drop upload queue
**As an admin, I want to drag files into the gallery upload zone and preview them before submission, so that I can validate the batch before committing it.**

**Acceptance Criteria**
- The SPA provides a visible drop zone plus file-picker fallback.
- Selected files render a preview queue with filename, thumbnail, size, and validation state.
- Files rejected by type or size show inline errors before any network request is sent.

#### US-4.2 Batch progress and status feedback
**As an admin, I want to see per-file and overall upload progress, so that I can distinguish a slow upload from a failed upload.**

**Acceptance Criteria**
- The UI displays one overall batch progress bar and one status row per file.
- SSE-driven status updates map to user-readable messages and terminal states.
- On failure, the UI shows which file failed and whether rollback completed.

#### US-4.3 Album-aware batch operations
**As an admin, I want to assign an album during upload and perform bulk selection actions in the gallery, so that organization happens as part of ingestion instead of as a later cleanup task.**

**Acceptance Criteria**
- The upload flow allows optional album selection before submission.
- Successful uploads reflect album assignment in the returned payload and rendered gallery state.
- Existing bulk delete behavior still works with the new selection model.

### Slice 5: Albums / Collections

#### US-5.1 Album lifecycle management
**As an admin, I want to create albums with basic descriptive metadata, so that related assets can be grouped intentionally.**

**Acceptance Criteria**
- `POST /albums` creates an album with validated `name` (required, 1-100 chars, trimmed) and optional `description` (max 500 chars).
- Album `name` is **globally unique** across the system; duplicate names return `409 Conflict` with error message `"Album name already exists"`.
- `GET /albums` returns album metadata plus image counts and cover image ID.

#### US-5.2 Image-to-album assignment
**As an admin, I want to assign an image to an album, so that the gallery can be filtered by collection without moving or duplicating files.**

**Acceptance Criteria**
- `PATCH /images/:id/album` assigns or clears an album reference for an image.
- Assignment rejects invalid album IDs and nonexistent image IDs with stable error responses.
- Existing image retrieval endpoints continue to return image data even when no album is assigned.

#### US-5.3 Album filtered browsing
**As a gallery user, I want to browse images by album, so that large libraries remain discoverable as asset volume grows.**

**Cover Image Fallback Rule**

1. When an album is created, `coverImage` is `null`.
2. When the first image is assigned to an album, `coverImage` automatically becomes that image's ID.
3. When the current `coverImage` is deleted or unassigned from the album:
   - If the album has other images, `coverImage` falls back to the **most recently uploaded** remaining image (by `uploadDate` descending).
   - If the album has no remaining images, `coverImage` becomes `null`.
4. Admin can explicitly set `coverImage` via `PATCH /albums/:id` with `{ coverImage: imageId }`.
5. `GET /albums` always returns `coverImage` as either an image ID or `null`; never a broken reference.

**Acceptance Criteria**
- `GET /albums/:id/images` returns paginated images for the requested album.
- The frontend can filter the gallery by album and return to the unfiltered gallery without a full-page reload.
- Album cover image behavior follows the deterministic fallback rule above; deleting the cover image triggers automatic reassignment without manual intervention.

### Story Count Summary

- Total user stories: **15**
- Total vertical slices: **5**

---

## Implementation Decisions

### Module Boundaries

| Module | Interface (small) | Hides (large) |
|---|---|---|
| `src/controllers/uploadBatchController.js` or extension of `imageController.js` | Parse request, validate batch inputs, return response envelope/job IDs | SSE orchestration, rollback steps, per-file execution sequencing |
| `src/services/batchUploadService.js` | `createBatchUpload()`, `rollbackBatchUpload()`, `getBatchProgress()` | Concurrency limits, transaction sessions, compensating cleanup, progress event emission |
| `src/services/imageProcessingService.js` | `generateVariants(file, options)` | Sharp pipeline configuration, watermark composition, WebP generation, temp-file handling |
| `src/services/storageVariantService.js` | `storeVariant()`, `deleteVariantSet()` | Cloudinary/local dual-write rules, naming conventions, fallback storage paths |
| `src/services/uploadProgressService.js` | `createJob()`, `publishProgress()`, `completeJob()` | SSE client registry, heartbeat policy, TTL cleanup, terminal-state retention |
| `src/models/Image.js` (extended) | Schema fields for variants, album reference, processing metadata | Storage-specific internals for derived assets |
| `src/models/Album.js` | Album schema and simple query surface | Cover fallback rules, count derivation strategy |
| `src/routes/imageRoutes.js` (extended) | Existing routes plus `/uploadImages`, `/images/:id/variant/:size`, `/uploads/progress/:jobId`, `/images/:id/album` | Rate-limiter wiring, route ordering, guard composition |
| `src/routes/albumRoutes.js` | `/albums`, `/albums/:id/images` | Pagination parameter normalization, count hydration |
| `public/app.js` (extended within AppState pattern) | View-state updates, DOM event handlers, rendering hooks | Drag/drop interactions, queue diffing, SSE subscription lifecycle, optimistic UI rollback |
| `public/uploadQueue.js` or equivalent module split | `addFiles()`, `removeFile()`, `renderQueue()` | Thumbnail generation, client-side validation, queue state mutations |
| `tests/` utilities | `createAuthCookie()`, `seedImage()`, `cleanupDb()` | Fixture generation, mock lifecycle, environment bootstrapping |

### Decision Log

| Choice | Rejected Alternative | Rationale |
|---|---|---|
| Add automated tests before shipping other slices | Build new features first and backfill tests later | The brief identifies missing tests as the critical gap; feature work without a test harness would increase regression risk and slow refactors. |
| Preserve Controller-Service-Model with new focused services | Collapse new behavior into existing controller/service files only | New services keep interfaces small and contain growing hidden complexity without violating current architecture. |
| Use stored variants generated at upload time | Generate all resized assets on demand per request | Pre-generation gives deterministic latency, simpler caching semantics, and avoids repeated Sharp work under load. |
| Use SSE for upload progress | Introduce WebSockets | SSE matches one-way server-to-client progress reporting with lower complexity and fits current Express deployment assumptions. |
| Support transaction + compensating-action fallback | Require Mongo replica set everywhere | The brief notes local-dev transaction risk; fallback behavior preserves operability while keeping stronger guarantees where transactions exist. |
| Keep vanilla JS + AppState frontend | Rewrite frontend in React or another framework | A framework rewrite is out of scope and would violate the mandate to preserve existing frontend patterns. |
| Add dedicated Album model with image reference linkage | Store album names as denormalized strings on images only | First-class albums are needed for counts, filtering, cover behavior, and future extensibility without duplicate text updates. |
| Preserve `GET /images/:id/src` as canonical full render path | Replace it with direct Cloudinary or local variant URLs in UI | Project mandates require proxy-based full-size rendering and existing consumers depend on that path. |

### Technology Choices with Rationale

| Technology | Decision | Rationale |
|---|---|---|
| Jest + Supertest | Adopt for backend tests | Aligns with Express integration testing, works well with mocked services, and is explicitly in scope. |
| Playwright | Adopt for frontend e2e | Headless CI support and reliable browser automation for the existing SPA. |
| Sharp | Expand current usage | Already present in the stack and suitable for thumbnails, WebP conversion, and watermark composition. |
| Manual SSE implementation in Express | Prefer over adding another abstraction unless complexity forces it | Keeps dependencies lean and the event contract explicit; can fall back to a helper package only if manual implementation becomes brittle. |
| Mongoose transactions where available | Use for atomic batch persistence | Fits existing persistence layer and gives stronger guarantees for bulk upload operations. |
| In-memory job registry with TTL for progress | Prefer for v2.0 over persistent queue infrastructure | Matches current scope, avoids introducing Redis/queue infrastructure, and is sufficient for per-request progress tracking with bounded retention. |

### Integration Points with Existing Systems

| Existing System | Integration Requirement |
|---|---|
| Auth middleware (`protect`, `restrictTo('admin')`) | New write routes (`/uploadImages`, `/albums`, `/images/:id/album`) must reuse the current admin guard chain and preserve portfolio passive-intercept behavior on the frontend. |
| Upload middleware (`src/middlewares/upload.js`) | Multi-file upload must reuse MIME validation and size limits while extending the single-file path to support bounded arrays. |
| Cloudinary/local fallback storage | Variant storage and rollback logic must preserve Cloudinary-primary behavior and local fallback compatibility. |
| `GET /images/:id/src` proxy | Full-size rendering remains canonical; new variant delivery must not bypass or regress this flow. |
| `Image` schema and existing response envelopes | New fields must be additive and backwards-compatible so existing clients do not break when albums/variants are absent. |
| Frontend `AppState` in `public/app.js` | Batch queue, album filtering, and progress state must extend the current centralized state object rather than introducing unrelated global patterns. |
| ESLint + Prettier | All new backend, frontend, and test files must follow current lint/format rules. |
| Security mandates | New endpoints need rate limiting, safe cookie/CORS behavior, and explicit unauthorized/forbidden responses consistent with current auth flows. |

### Compatibility Rules

- Existing single-upload and image-read routes remain available and behaviorally unchanged.
- Existing response helper patterns remain authoritative for success and error envelopes.
- New fields on image payloads must be optional/additive for old clients.
- New album and progress endpoints must not require changes to guest gallery usage.

---

## Testing Decisions

### Feedback Loops

1. **Fast local loop**
   - `npm test` runs unit + integration suites locally.
   - `npm run test:coverage` generates coverage reports.
   - `npm run lint` remains mandatory before merge.

2. **Slice-level verification loop**
   - Each vertical slice lands with backend tests first or alongside implementation.
   - Frontend-visible slices include Playwright smoke coverage for the changed workflow.
   - Mocked Cloudinary paths are required for CI determinism.

3. **Release loop**
   - Full test suite passes in headless CI.
   - Bulk upload performance scenario validates 10-image upload completes within the target contract on standard hardware.
   - Regression checks confirm legacy endpoints still pass prior integration cases.

### TDD Approach

- **Red**: Add or update failing unit/integration/e2e test describing the next behavior change.
- **Green**: Implement the smallest controller/service/model/frontend change that makes the test pass.
- **Refactor**: Extract shared helpers, tighten module boundaries, and remove duplication while keeping tests green.
- Apply TDD first to Wave 1, then use the same pattern for each feature slice, especially for rollback behavior and image variant generation where regressions are costly.

### Manual QA Checkpoints

| Checkpoint | Steps | Expected Outcome |
|---|---|---|
| Legacy single upload regression | Log in as admin, upload one valid image through existing UI, open it in lightbox | Upload still works, image is visible, proxy endpoint still renders full asset |
| Batch upload success path | Drag 3 valid files into queue, assign album, submit batch, observe progress | Queue progresses to complete, all images appear in gallery, album assignment persists |
| Batch upload rollback path | Submit a batch with one intentionally failing file under controlled test mode | UI shows failure, rollback state is visible, no partial DB records/assets remain |
| Variant delivery | Open gallery/listing and request thumb/preview/full variants for one image | Variants resolve correctly and match expected dimensions/format metadata |
| Album filtering | Create album, assign images, filter gallery by album, clear filter | Filtered gallery shows only assigned assets; clearing filter restores full list without reload |
| Guest authorization safety | As guest, attempt upload or album mutation from visible controls | Passive intercept/unauthorized messaging appears, no protected mutation succeeds |

### Coverage Targets

- Minimum release target: **>80% line coverage across `src/` excluding `src/config/database.js`**.
- Mandatory coverage for new services handling rollback, variant generation, and album assignment.
- Mandatory integration coverage for every new API route.

---

## Out of Scope

The following items are explicitly excluded from v2.0:

- Real-time collaborative editing
- AI-powered image tagging beyond current Cloudinary tags
- Video upload support
- Mobile native applications
- Payment/subscription features
- CDN edge caching beyond Cloudinary’s existing delivery capabilities
- Frontend framework rewrite
- Persistent job queue infrastructure (unless later required by scale beyond v2.0 scope)

---

## Open Questions / Risks

### Open Questions

No unresolved open questions remain. All previous ambiguities have been resolved through PRD updates.

**Resolved (post-Momus review)**:
- ✅ Variant dimensions contract defined in US-2.1 (150×150 thumb, 800×600 preview, 1920×1080 full).
- ✅ Variant metadata exposure defined: list excludes by default, detail includes, opt-in via query param (US-2.1).
- ✅ SSE payload schema and terminal semantics defined in US-3.2.
- ✅ Album cover fallback rule defined in US-5.3 (auto-reassign to most recent remaining image).
- ✅ Album name uniqueness: globally unique, enforced at API level (US-5.1).
- ✅ Watermark input contract defined: 1-50 printable ASCII chars, applied to full/preview only (US-2.3).
- ✅ In-memory progress registry deployment constraint documented in US-3.2 (process-local, acceptable for v2.0).

### Risks

1. **Cloudinary rate limits**  
   Bulk upload and variant storage can exceed provider limits without explicit concurrency caps and retry/backoff rules.

2. **Sharp memory spikes**  
   Parallel processing of multiple files and multiple variants can exhaust memory without bounded worker counts and temp-file cleanup.

3. **MongoDB transaction availability**  
   Some local/dev environments may lack replica-set support, requiring a compensating rollback mode that is well-tested and observable.

4. **Frontend complexity growth**  
   `public/app.js` is already large; drag-and-drop and progress orchestration can reduce maintainability if queue logic is not modularized.

5. **Backward-compatibility risk**  
   Schema additions and route expansion can accidentally alter existing response shapes if additive contracts are not enforced in integration tests.

### Assumptions

- Node.js 18+ remains available in development and CI.
- Sharp native dependencies are installable in all target environments.
- Cloudinary quota is sufficient for stored originals plus processed variants.
- MongoDB can either provide transactions or accept a tested compensating-action fallback.

---

## PRD Hardening Checklist Verification

| Hardening Area | Verification | v2.0 Decision |
|---|---|---|
| Content Boundaries | Defined explicit batch/file/process limits | Max 10 files per batch; default 200KB per file; variant set limited to `thumb`, `preview`, `full`; color palette remains max 6 colors; SSE job state retained only for bounded TTL |
| Score/Metric Normalization | Converted vague goals into measurable contracts | Success metrics use explicit thresholds: >80% coverage, `npm test` exit `0`, 10-image batch <30s, stable status/state enums for SSE |
| Fixture/Test Data Provenance | Defined source and control of fixtures | Test fixtures come from repository-controlled sample JPEG/PNG/WebP assets plus seeded DB/auth helpers; no production assets required in CI |
| Latency/Performance Contracts | Established measurable performance expectations | Batch upload of 10 images must complete in <30s on standard hardware; variant endpoint must return stored asset without runtime transform dependency |
| Token/Rate Limits with Fallback Behavior | Extended protection rules to new routes | Admin mutation routes inherit auth and upload rate limiting; Cloudinary concurrency is capped; when upstream limits are hit, batch fails explicitly and rollback executes |
| Error Boundaries | Named explicit failure behavior | Invalid files reject before processing; per-batch processing failures emit `failed`/`rolled_back`; unknown variant/image returns `404`; unauthorized mutations return existing `401/403` patterns |
| State/Persistence Contract | Defined where transient and durable state live | Durable state remains MongoDB (`Image`, `Album`) plus storage backends; transient upload job progress lives in in-memory registry with TTL cleanup; temp processing files are removed on success/failure |

### Hardening Result

All required hardening areas are explicitly addressed in this PRD. Any unresolved detail is captured under Open Questions rather than left implicit.

---

## Release Success Criteria

1. `npm test` exits `0` with unit, integration, and e2e suites configured for CI.
2. Line coverage exceeds 80% across `src/` excluding `src/config/database.js`.
3. All five feature slices are implemented and manually QA-verified.
4. Existing v1.4.1 routes continue to pass regression tests without breaking changes.
5. New protected routes preserve auth, RBAC, rate limiting, and passive frontend intercept behavior.
6. A 10-image batch upload completes within 30 seconds on standard hardware under expected local/cloud conditions.
7. ESLint passes and new files conform to ESM and existing codebase patterns.

---

## Recommended Execution Order

1. Slice 1 — Testing Infrastructure
2. Slice 2 — Image Processing Pipeline
3. Slice 3 — Bulk Upload API
4. Slice 4 — Drag-and-Drop Frontend
5. Slice 5 — Albums / Collections

This order preserves the brief’s requirement that testing infrastructure is the enabling foundation and ensures the frontend builds on stable processing/upload primitives.
