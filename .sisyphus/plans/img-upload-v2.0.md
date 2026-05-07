# Execution Plan: img-upload-v2.0

## TL;DR

**Plan Name:** img-upload-v2.0

**Summary:** Deliver a v2.0 release that transforms the current Express.js image upload API into a disciplined digital asset management platform with automated testing, image variant processing, batch uploads with live progress, drag-and-drop frontend workflows, and album organization — all while preserving v1.4.1 behavior and contracts.

**Deliverables:**
1. CI-ready test harness (Jest + Supertest + Playwright) with >80% coverage target
2. Sharp-based image processing pipeline generating thumb/preview/full WebP variants with optional watermarking
3. Multi-file batch upload API (up to 10 files) with SSE progress tracking and transactional rollback
4. Drag-and-drop frontend with preview queue, per-file/aggregate progress, and album-aware batch operations
5. Album lifecycle management with image assignment, filtered browsing, and automatic cover-image fallback

**Effort Estimate:** Large (5 vertical slices across backend, frontend, and verification)

---

## Wave 1: Testing Infrastructure (blocked by: none)

**Goal:** Establish the test harness that all subsequent waves depend on. Replace the failing `npm test` placeholder with repeatable, CI-ready quality gates.

**Issue Reference:** `.sisyphus/issues/01-testing-infrastructure.md`
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 1 (US-1.1, US-1.2, US-1.3)

### Tasks

- [ ] **Task 1.1: Configure Jest + Supertest backend test harness**
  - What: Install and configure Jest, Supertest, and coverage reporting. Set up `npm test` and `npm run test:coverage` scripts.
  - Output: `jest.config.js`, test directory structure, working `npm test` command
  - Verify: `npm test` exits 0 with a sample test

- [ ] **Task 1.2: Write unit tests for backend utilities and middleware**
  - What: Cover `responseHelper`, `fileUtils`, and `multerError` with success and failure branches
  - Output: `tests/unit/utils/responseHelper.test.js`, `tests/unit/utils/fileUtils.test.js`, `tests/unit/middlewares/multerError.test.js`
  - Verify: All unit tests pass; coverage summary readable for `src/utils/` and `src/middlewares/`

- [ ] **Task 1.3: Write integration tests for existing auth and image endpoints**
  - What: Supertest coverage for `POST /auth/login`, `POST /auth/logout`, `GET /auth/getMe`, `GET /images`, `GET /images/:id`, `GET /images/:id/src`
  - Output: `tests/integration/auth.test.js`, `tests/integration/images.test.js`
  - Verify: Tests assert response envelope shape (`success`, `data`, `error`) and expected status codes; Cloudinary is mocked

- [ ] **Task 1.4: Set up Playwright E2E tests**
  - What: Configure Playwright for headless CI, seed test environment, cover guest gallery view, admin login, and one authorized asset-management action
  - Output: `playwright.config.js`, `tests/e2e/gallery.spec.js`, `tests/e2e/auth.spec.js`
  - Verify: `npx playwright test` runs headlessly; failures produce screenshots/traces

- [ ] **Task 1.5: Create test utilities and fixtures**
  - What: Build `createAuthCookie()`, `seedImage()`, `cleanupDb()` helpers and repository-controlled sample image fixtures
  - Output: `tests/utils/testHelpers.js`, `tests/fixtures/sample-images/`
  - Verify: Utilities are importable and documented; fixtures are referenced in integration tests

- [ ] **Task 1.6: Verify coverage target for Wave 1**
  - What: Run `npm run test:coverage` and confirm >80% line coverage for tested modules
  - Output: Coverage report
  - Verify: Coverage meets or exceeds 80% for `src/utils/` and `src/middlewares/`

---

## Wave 2: Core Backend Features (blocked by: Wave 1)

**Goal:** In parallel, build the three backend-heavy vertical slices that extend the API with image processing, batch upload, and album organization. Each slice lands with unit and integration tests.

### Slice 2A: Image Processing Pipeline

**Issue Reference:** `.sisyphus/issues/02-image-processing-pipeline.md`
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 2 (US-2.1, US-2.2, US-2.3)

- [ ] **Task 2A.1: Create image processing service (`imageProcessingService.js`)**
  - What: Implement Sharp-based variant generation (`thumb`, `preview`, `full`) with WebP output, JPEG fallback, and no-upscale rule
  - Output: `src/services/imageProcessingService.js`
  - Verify: Unit tests confirm dimensions, fit rules, and format compliance per variant contract

- [ ] **Task 2A.2: Create storage variant service (`storageVariantService.js`)**
  - What: Dual-write variants to Cloudinary-primary/local-fallback with naming conventions and cleanup
  - Output: `src/services/storageVariantService.js`
  - Verify: Unit tests cover store and delete operations with mocked Cloudinary

- [ ] **Task 2A.3: Extend Image model with variants and watermark metadata**
  - What: Add `variants[]` and `watermarked` fields to `Image` schema; ensure additive/backwards-compatible
  - Output: Updated `src/models/Image.js`
  - Verify: Existing image retrieval endpoints still pass regression tests

- [ ] **Task 2A.4: Add variant delivery endpoint (`GET /images/:id/variant/:size`)**
  - What: New route serving stored variants; returns 404 for unknown sizes or missing variants
  - Output: Route added to `src/routes/imageRoutes.js`, handler in controller
  - Verify: Integration tests cover valid and invalid variant requests

- [ ] **Task 2A.5: Implement optional watermarking**
  - What: Accept `watermark` form field (1-50 printable ASCII), apply to `full` and `preview` only, validate input
  - Output: Watermark logic in `imageProcessingService.js`, validation in controller
  - Verify: Integration tests cover valid watermark, invalid watermark (400), and coexistence of watermarked/non-watermarked uploads

- [ ] **Task 2A.6: Wire variant generation into upload flow and verify backwards compatibility**
  - What: Trigger variant generation on successful upload; ensure `GET /images` list excludes variants by default, detail includes them, and `?includeVariants=true` opt-in works
  - Output: Updated upload controller logic
  - Verify: Integration tests confirm list/detail/src behavior per PRD contract

### Slice 2B: Bulk Upload API

**Issue Reference:** `.sisyphus/issues/03-bulk-upload-api.md`
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 3 (US-3.1, US-3.2, US-3.3)

- [ ] **Task 2B.1: Create batch upload service (`batchUploadService.js`)**
  - What: Orchestrate multi-file upload (1-10 files), enforce bounded concurrency, preserve existing single-upload path
  - Output: `src/services/batchUploadService.js`
  - Verify: Unit tests cover batch acceptance, rejection (>10 or 0 files), and concurrency limits

- [ ] **Task 2B.2: Create upload progress service (`uploadProgressService.js`)**
  - What: In-memory job registry with TTL cleanup, heartbeat, reconnect support, and SSE event emission per contract
  - Output: `src/services/uploadProgressService.js`
  - Verify: Unit tests cover job lifecycle, event types, TTL cleanup, and reconnect state

- [ ] **Task 2B.3: Implement SSE progress endpoint (`GET /uploads/progress/:jobId`)**
  - What: Server-Sent Events endpoint emitting `queued`, `processing`, `uploaded`, `failed`, `rolled_back`, `completed`, `heartbeat`
  - Output: Route and controller for SSE endpoint
  - Verify: Integration tests confirm event contract, terminal-state closure, and reconnect behavior

- [ ] **Task 2B.4: Implement transactional rollback and cleanup**
  - What: On batch failure, delete partial DB records and uploaded assets; remove temp files in all paths; use compensating-action fallback when MongoDB transactions are unavailable
  - Output: Rollback logic in `batchUploadService.js`, compensating-action documentation
  - Verify: Integration tests cover batch success, controlled failure, and rollback verification (no partial state)

- [ ] **Task 2B.5: Add batch upload route (`POST /uploadImages`)**
  - What: Multi-file `multipart/form-data` endpoint returning `jobId`; reuse existing upload middleware validation
  - Output: Route added to `src/routes/imageRoutes.js` or new batch route file
  - Verify: Integration tests confirm 1-10 file acceptance, 400 rejection, and existing `POST /uploadImage` still works

### Slice 2C: Albums / Collections

**Issue Reference:** `.sisyphus/issues/05-albums-collections.md`
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 5 (US-5.1, US-5.2, US-5.3)

- [ ] **Task 2C.1: Create Album model (`src/models/Album.js`)**
  - What: Schema with `name` (globally unique, 1-100 chars), `description` (max 500), `coverImage`, and image count derivation
  - Output: `src/models/Album.js`
  - Verify: Unit tests cover validation, uniqueness, and cover-image fallback logic

- [ ] **Task 2C.2: Add album lifecycle routes (`POST /albums`, `GET /albums`)**
  - What: Create album with validation; list albums with image counts and cover image ID; enforce 409 on duplicate names
  - Output: `src/routes/albumRoutes.js`, album controller
  - Verify: Integration tests cover creation, listing, and duplicate name rejection

- [ ] **Task 2C.3: Add image-to-album assignment (`PATCH /images/:id/album`)**
  - What: Assign or clear album reference; reject invalid album/image IDs; preserve existing retrieval contracts
  - Output: Route added to `src/routes/imageRoutes.js`
  - Verify: Integration tests cover assignment, clearing, and error cases

- [ ] **Task 2C.4: Add album filtered browsing (`GET /albums/:id/images`)**
  - What: Paginated image list per album; frontend can filter gallery without full-page reload
  - Output: Route in `src/routes/albumRoutes.js`
  - Verify: Integration tests confirm pagination and filtering behavior

- [ ] **Task 2C.5: Implement cover image fallback logic**
  - What: Auto-assign on first image; fallback to most-recently-uploaded on deletion/unassignment; explicit admin override via `PATCH /albums/:id`
  - Output: Cover fallback logic in album service or model hooks
  - Verify: Unit/integration tests cover all fallback scenarios per PRD rules

---

## Wave 3: Drag-and-Drop Frontend (blocked by: Wave 2 — Slices 2A and 2B)

**Goal:** Upgrade the vanilla JS frontend to a batch-first upload experience with drag-and-drop, preview queue, SSE-driven progress, and album-aware operations. Extends the existing `AppState` pattern.

**Issue Reference:** `.sisyphus/issues/04-drag-and-drop-frontend.md`
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 4 (US-4.1, US-4.2, US-4.3)

### Tasks

- [ ] **Task 3.1: Build drop zone and file-picker fallback**
  - What: Visible drop zone in the SPA with click-to-select fallback; integrate with existing upload UI area
  - Output: DOM elements and event handlers in `public/app.js` or new module
  - Verify: Playwright E2E confirms drag-and-drop and click-to-select both work

- [ ] **Task 3.2: Create upload queue module (`public/uploadQueue.js`)**
  - What: Modular queue with `addFiles()`, `removeFile()`, `renderQueue()`; generate client-side thumbnails; show filename, size, validation state
  - Output: `public/uploadQueue.js`
  - Verify: Files rejected by type/size show inline errors before network request; queue renders correctly

- [ ] **Task 3.3: Integrate batch upload submission with SSE progress**
  - What: Submit queue to `POST /uploadImages`, consume `GET /uploads/progress/:jobId` via SSE, render overall batch progress bar and per-file status rows
  - Output: SSE client logic in frontend, progress UI components
  - Verify: Playwright E2E confirms progress visibility and terminal state mapping

- [ ] **Task 3.4: Add album selection to upload flow**
  - What: Optional album dropdown/selector before batch submission; reflect album assignment in returned payload and gallery state
  - Output: Album selector UI, state wiring in `AppState`
  - Verify: Playwright E2E confirms album assignment persists after upload

- [ ] **Task 3.5: Extend gallery with album filtering and bulk actions**
  - What: Album filter UI (no full-page reload), bulk selection model compatible with existing bulk delete
  - Output: Filter controls, updated `AppState` for album filter and selection
  - Verify: Playwright E2E confirms filter/clear-filter cycle and bulk delete still works

- [ ] **Task 3.6: Handle failure and rollback visibility**
  - What: Display which file failed and whether rollback completed; map SSE `failed`/`rolled_back` to user-readable messages
  - Output: Error/rollback UI states
  - Verify: Playwright E2E covers failure path (via controlled test mode if needed)

- [ ] **Task 3.7: Regression test legacy single-upload UI**
  - What: Ensure existing single-file upload path and gallery behavior remain intact
  - Output: Playwright E2E regression coverage
  - Verify: Legacy upload flow passes E2E without modification

---

## Wave 4: Integration + Final Verification (blocked by: all above)

**Goal:** Wire all modules together, run the full test suite, perform manual QA checkpoints, and confirm all PRD acceptance criteria are met.

### Tasks

- [ ] **Task 4.1: Full test suite execution**
  - What: Run `npm test` (unit + integration) and `npx playwright test` (E2E) together
  - Output: Test logs, coverage report
  - Verify: All suites pass with exit code 0

- [ ] **Task 4.2: Coverage verification**
  - What: Run `npm run test:coverage` and inspect line coverage across `src/` excluding `src/config/database.js`
  - Output: Coverage report
  - Verify: Line coverage exceeds 80% across `src/`

- [ ] **Task 4.3: Manual QA checkpoints**
  - What: Execute all manual QA checkpoints from PRD Section "Manual QA Checkpoints"
  - Output: QA checklist with pass/fail notes
  - Verify:
    - [ ] Legacy single upload regression — upload via existing UI, open in lightbox
    - [ ] Batch upload success path — drag 3 files, assign album, observe progress, verify gallery
    - [ ] Batch upload rollback path — controlled failure, verify no partial state
    - [ ] Variant delivery — request thumb/preview/full variants, verify dimensions/format
    - [ ] Album filtering — create album, assign images, filter/clear filter without reload
    - [ ] Guest authorization safety — attempt protected mutations as guest, verify passive intercept

- [ ] **Task 4.4: Lint and format verification**
  - What: Run `npm run lint` (and format check if applicable)
  - Output: Lint report
  - Verify: No lint errors; new files conform to existing ESM and style patterns

- [ ] **Task 4.5: Backward-compatibility regression**
  - What: Confirm all v1.4.1 endpoints, response envelopes, and frontend behaviors remain unchanged
  - Output: Regression test results
  - Verify: Existing integration tests from Wave 1 still pass; no breaking changes in response shapes

- [ ] **Task 4.6: Performance validation**
  - What: Upload a 10-image batch on standard hardware and measure completion time
  - Output: Timing log
  - Verify: Batch completes within 30 seconds under expected local/cloud conditions

- [ ] **Task 4.7: Security and auth verification**
  - What: Confirm new protected routes (`/uploadImages`, `/albums`, `/images/:id/album`) reuse existing `protect` + `restrictTo('admin')` chain, rate limiting, and cookie/CORS behavior
  - Output: Security checklist
  - Verify: Unauthorized requests return 401/403 consistent with existing patterns; guest cannot mutate

- [ ] **Task 4.8: Final cleanup and documentation**
  - What: Remove debug code, TODO markers, and temporary comments; update README with v2.0 features
  - Output: Clean codebase, updated README
  - Verify: No `console.log` debug statements, no `TODO`/`FIXME` markers left in production code

---

## State Tracking

**Active Plan:** `.sisyphus/plans/img-upload-v2.0.md`
**State File:** `.sisyphus/state/img-upload-v2.0.json`
**Notepad:** `.sisyphus/notepads/img-upload-v2.0/`

### Waves Summary

| Wave | Issues | Blocked By | Status |
|------|--------|------------|--------|
| Wave 1 | 01 — Testing Infrastructure | — | Ready |
| Wave 2 | 02 — Image Processing Pipeline, 03 — Bulk Upload API, 05 — Albums / Collections | Wave 1 | Pending |
| Wave 3 | 04 — Drag-and-Drop Frontend | Wave 2 (Slices 2A + 2B) | Pending |
| Wave 4 | Integration + Final Verification | All above | Pending |

### Ready Queue

1. **Wave 1 — Testing Infrastructure** (Issue 01) — can start immediately

### Parallel Execution Groups

- After Wave 1 completes: **Group A** — Issue 02 + Issue 03 + Issue 05 can run in parallel
- After Group A completes: **Group B** — Issue 04 can start
- After all waves complete: **Wave 4** — Integration + Final Verification

---

## Plan Metadata

- **Created:** 2026-05-05
- **PRD:** `.sisyphus/prds/img-upload-v2.0-prd.md`
- **Issues Directory:** `.sisyphus/issues/`
- **Total User Stories:** 15
- **Total Vertical Slices:** 5
- **Effort:** Large
