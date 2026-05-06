# Planning Brief: Img-upload-with-multer v2.0

## 1. Project Context

**Project**: Img-upload-with-multer  
**Current Version**: v1.4.1 (Admin Authorization, JWT, RBAC, Secure Cookies, Portfolio Mode)  
**Repository**: https://github.com/TVATDCI/Img-upload-with-multer  
**Type**: Node.js Express API with MongoDB persistence and Cloudinary cloud storage  

### Current Architecture

The project follows a disciplined **Controller-Service-Model** pattern:

```
src/
├── config/          # Environment config + MongoDB connection
├── controllers/     # HTTP request/response handlers (image, auth)
├── services/        # Business logic (imageService, cloudinaryService)
├── models/          # Mongoose schemas (Image, User)
├── routes/          # Route definitions + aggregator
├── middlewares/     # Auth guards, multer config, error handlers
└── utils/           # Response helpers, file utilities

public/              # Vanilla JS SPA (HTML, CSS, JS)
scripts/             # Admin seeding script
```

**Tech Stack**:
- Express 5.2.1, Mongoose 9.3.1, Multer 2.1.1
- Cloudinary SDK v2 for cloud storage with local fallback
- JWT + bcryptjs + cookie-parser for auth (httpOnly, SameSite: Strict)
- Helmet, express-rate-limit, CORS for security
- image-size, colorthief, sharp for metadata extraction
- ESLint + Prettier for code quality

### Current Capabilities

| Feature | Status |
|---------|--------|
| Single image upload (max 200KB, JPEG/PNG/GIF/WebP) | ✅ |
| Cloudinary primary + local fallback | ✅ |
| Metadata extraction (dimensions, 6 colors, tags, MIME) | ✅ |
| Asset Inspector lightbox with sidebar | ✅ |
| Pagination, search, sorting | ✅ |
| JWT authentication + RBAC | ✅ |
| Rate limiting on auth and upload | ✅ |
| Image proxy endpoint (`/images/:id/src`) | ✅ |
| Portfolio mode with passive auth intercept | ✅ |

### Critical Gap

**No test suite exists.** `npm test` script echoes `"Error: no test specified" && exit 1`. All other features are production-ready.

---

## 2. Initiative Overview

### Goal

Transform the image upload API from a single-file upload tool into a **professional digital asset management platform** with bulk processing capabilities, comprehensive testing, and modern UX.

### Target Outcome

A v2.0 release that includes:
1. Complete test coverage (unit, integration, e2e)
2. Image processing pipeline (thumbnails, WebP, watermarking)
3. Bulk upload with progress tracking and transactional rollback
4. Modern drag-and-drop frontend with batch operations
5. Album/collection organization for gallery management

---

## 3. Scope

### In Scope

1. **Testing Infrastructure**
   - Jest + Supertest for backend unit/integration tests
   - Playwright for frontend e2e tests
   - CI-ready test scripts and coverage reporting
   - Test utilities for auth mocking, file fixtures, DB cleanup

2. **Image Processing Pipeline**
   - Sharp-based thumbnail generation (3 sizes: thumb, preview, full)
   - WebP conversion for all processed variants
   - Optional text watermarking (configurable per upload)
   - Processed variants stored alongside originals (local + Cloudinary)
   - Updated Image schema to track variants
   - New `GET /images/:id/variant/:size` endpoint

3. **Bulk Upload API**
   - `POST /uploadImages` accepting multiple files (max 10 per request)
   - Parallel Cloudinary uploads with concurrency limiting
   - Progress tracking via Server-Sent Events (`/uploads/progress/:jobId`)
   - Transactional rollback: if any upload fails, all partial uploads cleaned up
   - Atomic batch creation in MongoDB

4. **Drag-and-Drop Frontend**
   - Modern upload zone with drag-and-drop support
   - Progress bars for individual files and overall batch
   - Preview queue with image thumbnails before upload
   - Batch selection and bulk delete UI
   - Album assignment during upload

5. **Albums/Collections**
   - New `Album` Mongoose model (name, description, coverImage, createdAt)
   - `POST /albums` — Create album
   - `GET /albums` — List albums with image counts
   - `PATCH /images/:id/album` — Assign image to album
   - `GET /albums/:id/images` — Get images in album
   - Gallery filtering by album

### Out of Scope

- Real-time collaborative editing
- AI-powered image tagging (beyond current Cloudinary tags)
- Video upload support
- Mobile native app
- Payment/subscription features
- CDN edge caching (Cloudinary already provides this)

---

## 4. Technical Constraints

### Must Preserve
- Existing JWT + RBAC authentication flow
- Cloudinary primary / local fallback storage strategy
- Portfolio mode UX (visible admin buttons with passive intercept)
- 200KB file size limit (can be configurable but default stays)
- Current MIME type whitelist (image/jpeg, image/png, image/gif, image/webp)
- MongoDB as primary database
- Express 5.x + ESM module system

### Must Respect
- All existing API contracts (response shapes, status codes)
- Existing frontend state management (AppState pattern)
- ESLint + Prettier formatting rules
- Security mandates from docs/Project_Mandates.md

### New Dependencies (Expected)
- `jest`, `supertest`, `@jest/globals` — Testing
- `playwright` — E2E testing
- `sharp` — Already present, will use more extensively
- `sse-express` or manual SSE implementation — Progress tracking

---

## 5. First Execution Wave

**Wave 1: Testing Infrastructure**

The first concrete slice of work is establishing the testing foundation. Without tests, we cannot safely refactor or add the subsequent features.

**Deliverables:**
1. Install and configure Jest + Supertest with ESM support
2. Create test utilities: auth mocking (JWT cookie generation), file fixtures (sample JPEG/PNG files), DB cleanup helpers
3. Write unit tests for: responseHelper, fileUtils, multerError handler
4. Write integration tests for: auth routes (login/logout/getMe), image routes (GET /images, GET /images/:id, GET /images/:id/src)
5. Update `npm test` script and add coverage reporting (`npm run test:coverage`)

**Success Criteria for Wave 1:**
- `npm test` runs without errors and exits 0
- Coverage report generated for at least `src/utils/` and `src/middlewares/`
- CI-ready test configuration (can run in headless environment without Cloudinary credentials via mocking)

**Rationale:** Testing infrastructure is the foundation. It validates existing behavior, protects against regressions, and enables confident development of the image processing, bulk upload, and frontend features in subsequent waves.

---

## 6. Success Criteria

1. **Test Coverage**: >80% line coverage across src/ (excluding config/database.js)
2. **All Tests Pass**: `npm test` exits 0 with comprehensive suite
3. **Feature Completeness**: All 5 major features implemented and functional
4. **Zero Breaking Changes**: All v1.4.1 API endpoints continue to work unchanged
5. **Security Maintained**: No new vulnerabilities introduced; rate limiting extended to new endpoints
6. **Performance**: Bulk upload of 10 images completes in <30s on standard hardware
7. **Code Quality**: ESLint passes, no type errors, consistent with existing patterns

---

## 7. Risks & Assumptions

### Risks
- **Cloudinary rate limits**: Bulk upload may hit Cloudinary API rate limits; need concurrency control
- **Memory usage**: Sharp processing can spike memory; need stream-based processing and limits
- **MongoDB transaction support**: Bulk upload atomicity requires replica set; local dev may need workaround
- **Frontend complexity**: Vanilla JS SPA has grown large; drag-and-drop may require architectural cleanup

### Assumptions
- MongoDB is running with replica set capability (or we implement non-transactional fallback)
- Cloudinary account has sufficient upload quota
- Development environment has Node.js 18+ and native dependencies for sharp

---

## 8. Reference Documents

- `docs/SPEC.md` — Phase 3 technical spec (Asset Inspector)
- `docs/Project_Mandates.md` — Architectural mandates
- `docs/Authorization.md` — RBAC implementation details
- `README.md` — Current feature overview and setup

---

*Brief Created: 2026-05-05*  
*Status: Awaiting validation and approval*
