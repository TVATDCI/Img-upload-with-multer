# Issue 02: Image Processing Pipeline

**Title:** Build Sharp-based variant generation, WebP delivery, and optional watermarking

**Type:** AFK
**Estimated Effort:** large
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 2

---

## Description

This slice adds deterministic image variant generation to the upload flow. On every successful upload, Sharp produces `thumb`, `preview`, and `full` variants as WebP with JPEG fallback. Variants are stored alongside originals, metadata is persisted in `Image.variants[]`, and a new endpoint serves specific variants by size. Optional text watermarking can be applied to `full` and `preview` variants per upload request.

The slice covers three user stories:
- **US-2.1:** Variant generation on upload (thumb 150×150, preview 800×600, full 1920×1080)
- **US-2.2:** WebP derivative delivery via `GET /images/:id/variant/:size`
- **US-2.3:** Optional watermarking (1-50 printable ASCII chars, bottom-right, 50% opacity)

---

## Acceptance Criteria

- [ ] Every successful upload creates `thumb`, `preview`, and `full` variants for supported MIME types.
- [ ] Each variant records width, height, format, and storage location in persistence.
- [ ] Variant dimensions comply with the contract: `thumb` 150×150 cover/center crop, `preview` 800×600 inside/contain, `full` 1920×1080 inside/contain (no upscale).
- [ ] Aspect ratio is preserved via `fit: 'inside'` for `preview`/`full`, and `fit: 'cover'` with `position: 'center'` for `thumb`.
- [ ] All variants are stored as WebP with JPEG fallback when the original is not WebP-compatible.
- [ ] Original images smaller than a variant's max dimensions are preserved at original size (no upscale).
- [ ] `GET /images/:id/variant/:size` returns the correct variant for valid sizes (`thumb`, `preview`, `full`) and `404` for unknown sizes or missing variants.
- [ ] `GET /images` list endpoint remains backwards-compatible (no `variants` field unless `?includeVariants=true` is passed).
- [ ] `GET /images/:id` detail endpoint includes `variants` array with all generated variants.
- [ ] Existing `GET /images/:id/src` behavior remains unchanged and still serves the canonical full-size image.
- [ ] Watermarking is opt-in per upload request via `watermark` form field and defaults to disabled.
- [ ] Valid watermark text is applied to `full` and `preview` variants; `thumb` variants remain unwatermarked.
- [ ] Invalid watermark input returns `400 Bad Request` with message `"Invalid watermark: must be 1-50 printable characters"` without creating partial database state.
- [ ] Watermarked and non-watermarked uploads can coexist in storage and metadata.
- [ ] `GET /images/:id` includes `watermarked: true/false` flag in response.
- [ ] New services (`imageProcessingService`, `storageVariantService`) have unit test coverage.
- [ ] Integration tests cover variant generation, variant endpoint delivery, and watermark validation.

---

## Blockers

- **Issue 01** (Testing Infrastructure) — variant services and routes need the test harness, mocks, and fixture utilities established in Slice 1.

---

## Vertical Slice Justification

This slice spans backend services (Sharp pipeline, storage dual-write), data model extensions (`Image.variants[]`), API routes (`/images/:id/variant/:size`), and verification (unit + integration tests). It produces working processed assets and a new delivery endpoint — an end-to-end feature, not a backend-only layer.
