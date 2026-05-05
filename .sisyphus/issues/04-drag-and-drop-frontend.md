# Issue 04: Drag-and-Drop Frontend

**Title:** Build batch-first upload UI with drag-and-drop, preview queue, and SSE progress

**Type:** human-review
**Estimated Effort:** large
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 4

---

## Description

This slice upgrades the current vanilla JS upload flow into a batch-first experience. Admins can drag files into a drop zone, preview and validate them in a queue, submit the batch, and watch per-file and aggregate progress via SSE. Album assignment is available at upload time, and bulk selection actions work with the new queue model. The existing `AppState` pattern is extended rather than replaced.

The slice covers three user stories:
- **US-4.1:** Drag-and-drop upload queue with file-picker fallback and inline validation
- **US-4.2:** Batch progress and status feedback driven by SSE events
- **US-4.3:** Album-aware batch operations (album selection on upload, bulk actions)

---

## Acceptance Criteria

- [ ] The SPA provides a visible drop zone plus file-picker fallback.
- [ ] Selected files render a preview queue with filename, thumbnail, size, and validation state.
- [ ] Files rejected by type or size show inline errors before any network request is sent.
- [ ] The UI displays one overall batch progress bar and one status row per file.
- [ ] SSE-driven status updates map to user-readable messages and terminal states.
- [ ] On failure, the UI shows which file failed and whether rollback completed.
- [ ] The upload flow allows optional album selection before submission.
- [ ] Successful uploads reflect album assignment in the returned payload and rendered gallery state.
- [ ] Existing bulk delete behavior still works with the new selection model.
- [ ] Frontend state extends the current `AppState` pattern in `public/app.js` rather than introducing unrelated global patterns.
- [ ] Queue logic is modularized (e.g., `public/uploadQueue.js`) with `addFiles()`, `removeFile()`, and `renderQueue()` interfaces.
- [ ] Playwright E2E tests cover the drag-and-drop success path, validation rejection, and progress visibility.
- [ ] Legacy single-upload UI continues to work without regression.

---

## Blockers

- **Issue 02** (Image Processing Pipeline) — the frontend needs variant endpoints and processed assets to display thumbnails and previews in the queue.
- **Issue 03** (Bulk Upload API) — the frontend needs the batch upload endpoint and SSE progress endpoint to submit batches and receive status updates.

---

## Vertical Slice Justification

This slice spans frontend modules (drop zone, preview queue, SSE client, album selector), backend integration (consuming `/uploadImages` and `/uploads/progress/:jobId`), and verification (Playwright E2E). It produces a visible, interactive batch upload workflow — an end-to-end feature, not a frontend-only layer.
