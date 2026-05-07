# Issue 03: Bulk Upload API

**Title:** Implement multi-file batch upload with SSE progress and transactional rollback

**Type:** AFK
**Estimated Effort:** large
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 3

---

## Description

This slice extends the upload surface from single-file to batch-first. Admins can submit up to 10 images in one `multipart/form-data` request. The system tracks per-file and aggregate progress via Server-Sent Events (SSE), enforces bounded concurrency against Cloudinary and local processing, and guarantees rollback/cleanup when a batch fails mid-flight. The existing single-upload endpoint remains untouched.

The slice covers three user stories:
- **US-3.1:** Multi-file batch submission (1-10 files, 200KB default per file)
- **US-3.2:** Real-time progress tracking via SSE with reconnect support
- **US-3.3:** Transactional rollback and cleanup for failed batches

---

## Acceptance Criteria

- [ ] `POST /uploadImages` accepts `multipart/form-data` with 1-10 files and rejects 0 files or more than 10 with a `400` response.
- [ ] Default per-file size limit remains 200KB unless explicitly reconfigured.
- [ ] Existing `POST /uploadImage` continues to work unchanged.
- [ ] Each batch upload returns a `jobId` that can be consumed by `GET /uploads/progress/:jobId`.
- [ ] SSE endpoint emits all event types per contract: `queued`, `processing`, `uploaded`, `failed`, `rolled_back`, `completed`, `heartbeat`.
- [ ] Per-file progress fields include `jobId`, `fileIndex`, `filename`, `progressPercent`, `status`, and `message`.
- [ ] Aggregate progress fields include `jobId`, `totalFiles`, `completedFiles`, `failedFiles`, `overallPercent`, and `status`.
- [ ] Progress stream closes automatically on terminal states (`completed`, `rolled_back`) and after 5 minutes of inactivity.
- [ ] Completed jobs are retained in memory for 10 minutes, then TTL cleanup removes them.
- [ ] Reconnecting clients receive the current aggregate state, then per-file deltas.
- [ ] If any file in a batch fails after processing begins, created DB records and uploaded assets from that job are deleted or marked cleanly rolled back before the request is finalized.
- [ ] Local temporary files are removed in both success and failure paths.
- [ ] When MongoDB transactions are unavailable, the system uses a documented compensating-action fallback and surfaces the mode in logs.
- [ ] In-memory progress registry is process-local (acceptable for v2.0 per deployment constraint).
- [ ] New services (`batchUploadService`, `uploadProgressService`) have unit test coverage.
- [ ] Integration tests cover batch success, batch failure/rollback, SSE event contract, and reconnect behavior.

---

## Blockers

- **Issue 01** (Testing Infrastructure) — batch services and SSE routes need the test harness, mocks, and fixture utilities established in Slice 1.

---

## Vertical Slice Justification

This slice spans backend services (batch orchestration, progress registry, rollback logic), API routes (`/uploadImages`, `/uploads/progress/:jobId`), data model extensions (job state, transaction sessions), and verification (unit + integration tests). It produces a working batch upload endpoint with live progress — an end-to-end feature, not a backend-only layer.
