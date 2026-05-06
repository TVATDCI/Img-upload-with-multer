# Issue 01: Testing Infrastructure

**Title:** Establish Jest + Supertest backend tests and Playwright E2E coverage

**Type:** AFK
**Estimated Effort:** medium
**PRD Reference:** `.sisyphus/prds/img-upload-v2.0-prd.md` — Slice 1

---

## Description

This enabling slice replaces the current failing `npm test` placeholder with a repeatable, CI-ready test harness. It establishes Jest + Supertest for backend unit and integration coverage, and Playwright for frontend end-to-end smoke tests. All later feature slices depend on this infrastructure for regression protection.

The slice covers three user stories:
- **US-1.1:** Backend utility coverage (`responseHelper`, `fileUtils`, `multerError`)
- **US-1.2:** API regression coverage for existing auth and image endpoints
- **US-1.3:** Playwright E2E coverage for public gallery and admin authentication flow

---

## Acceptance Criteria

- [ ] `npm test` executes unit tests for `responseHelper`, `fileUtils`, and `multerError` and exits with code `0`.
- [ ] Test cases cover success and failure branches for each target module.
- [ ] Coverage output includes a readable summary for `src/utils/` and `src/middlewares/`.
- [ ] Supertest covers `POST /auth/login`, `POST /auth/logout`, `GET /auth/getMe`, `GET /images`, `GET /images/:id`, and `GET /images/:id/src`.
- [ ] Tests assert existing response envelope shape (`success`, `data`, `error`) and expected status codes.
- [ ] Cloudinary behavior is mockable so tests pass without real credentials.
- [ ] Playwright can run headlessly in CI against a seeded local environment.
- [ ] E2E coverage includes guest gallery view, admin login, and at least one authorized asset-management action.
- [ ] Failure output includes screenshots or traces for debugging.
- [ ] `npm run test:coverage` generates coverage reports with >80% line coverage target for tested modules.
- [ ] Test utilities exist for `createAuthCookie()`, `seedImage()`, and `cleanupDb()`.

---

## Blockers

None. This is the enabling slice and can start immediately.

---

## Vertical Slice Justification

This slice cuts through backend (unit tests for utils/middleware, integration tests for routes), test infrastructure (Jest config, mocks, fixtures), and frontend (Playwright E2E). It produces a working test harness that is visible via `npm test` and CI status — an end-to-end outcome, not a horizontal layer.
