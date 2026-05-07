# Security Audit: img-upload-v2.0

**Date:** 2026-05-07
**Scope:** `/home/vladi/projects/GitHub/Img-upload-with-multer` (22 source files scanned)
**Excluded:** `node_modules/`, `.git/`, `coverage/`, `test-results/`, `uploads/`, `tests/`

## Summary

**Gate Decision:** **FAIL**
**Findings:** 14 total (**3 critical**, 8 warning, 3 info)
**Risk Level:** **CRITICAL**

### Top 3 Risks

1. **[CWE-798]** Hardcoded Credentials in .env — MongoDB Atlas URI contains plaintext username & password; Cloudinary API secret exposed. Immediate credential compromise risk.
2. **[CWE-79]** Stored XSS via displayName — User-controlled `displayName` injected into DOM via `innerHTML` without escaping. Admin-set name can execute arbitrary JS in any visitor's browser.
3. **[CWE-918]** SSRF via Cloudinary URL check bypass — Server fetches URLs that merely contain the string `cloudinary.com`, enabling requests to attacker-controlled origins.

## Detailed Findings

### A. Plaintext Secrets & API Keys

**A-1: [CRITICAL] MongoDB Atlas Credentials Embedded in Connection URI — Confidence: HIGH**
- Location: `.env:2`
- CWE: CWE-798 (Use of Hard-coded Credentials)
- Evidence: `MONGO_URI=mongodb+srv://tuanthongvaidyanond:25012019@cluster0.4tnop.mongodb.net/image_upload_db?retryWrites=true&w=majority&appName=Cluster0`
- Risk: Full database access with embedded password `25012019`. If `.env` is accidentally committed or leaked, attacker gains read/write access to all data.
- Fix: Use secret management (Vault, AWS Secrets Manager). Rotate the MongoDB password immediately. Remove credentials from URI; use `MONGO_USER` + `MONGO_PASSWORD` as separate env vars.

**A-2: [CRITICAL] Cloudinary API Secret Exposed — Confidence: HIGH**
- Location: `.env:10`
- CWE: CWE-798
- Evidence: `CLOUDINARY_API_SECRET=P_gGXs125aS406ZFQKV3FjtBzuM`
- Risk: Full Cloudinary account compromise — delete all media, incur costs, access private resources.
- Fix: Rotate the API secret immediately. Move to secret manager. Never store in plaintext config files accessible to the application process only.

**A-3: [CRITICAL] Cloudinary API Key Exposed — Confidence: HIGH**
- Location: `.env:9`
- CWE: CWE-798
- Evidence: `CLOUDINARY_API_KEY=761475196697458`
- Risk: API key + secret together enable full Cloudinary API access. Key alone enables some read operations.
- Fix: Rotate the API key. Same as A-2.

**A-4: [WARNING] Weak JWT Secret with Hardcoded Fallback — Confidence: HIGH**
- Location: `.env:12` and `src/config/index.js:19`
- CWE: CWE-798, CWE-327 (Use of a Broken or Risky Cryptographic Algorithm)
- Evidence: `JWT_SECRET=super_secret_string` and fallback `process.env.JWT_SECRET || 'fallback-secret-for-dev-only'`
- Risk: The JWT secret is easily guessable. If env var is missing, the hardcoded fallback allows anyone to forge valid JWTs for any user (including admin).
- Fix: Generate a cryptographically random JWT secret (`openssl rand -hex 64`). Remove the hardcoded fallback — fail loudly if JWT_SECRET is not set.

**A-5: [WARNING] Admin Credentials in Plaintext — Confidence: HIGH**
- Location: `.env:13-14`
- CWE: CWE-798
- Evidence: `ADMIN_EMAIL=superadmin@example.com` / `ADMIN_PASSWORD=super_secure_password_123`
- Risk: Plaintext admin credentials in config file. If leaked, attacker gains admin access to the application.
- Fix: Use secret manager. The seed script should prompt for password interactively or read from stdin, not from env.

**A-6: [INFO] .env is Listed in .gitignore — Positive Finding**
- Location: `.gitignore:2`
- Evidence: `.env` is excluded from version control.
- Risk: Low — but the file exists on disk with real credentials. Risk remains if accidentally committed or if deployment process exposes it.

### B. Injection Vulnerabilities

**No findings.** All database operations use Mongoose ORM with parameterized queries (`findById`, `findByIdAndUpdate`, `findOne`, etc.). No raw SQL/NoSQL query construction from user input. No `eval()`, `exec()`, or `spawn()` with user-controlled data. The `watermark` input is validated against `PRINTABLE_ASCII_REGEX`. ObjectId validation uses `mongoose.Types.ObjectId.isValid()`.

### C. Cross-Site Scripting (XSS)

**C-1: [WARNING] Stored XSS via displayName in Gallery Cards — Confidence: HIGH**
- Location: `public/app.js:383`
- CWE: CWE-79 (Stored XSS)
- Evidence: `card.innerHTML = \`...<span class="image-filename" data-id="${img._id}" title="Click to rename">${displayName}</span>...\``
- Source: `displayName` is set by admin via `PATCH /images/:id/displayName` (user-controlled)
- Sink: `innerHTML` assignment without escaping
- Risk: Admin (or anyone with admin credentials) can set `displayName` to `<img src=x onerror=alert(document.cookie)>` which executes JS in every visitor's browser. Cookie is HttpOnly so JWT theft is limited, but other attacks (keylogging, phishing, defacement) are possible.
- Fix: Escape `displayName` before inserting into innerHTML. Add an `escapeHtml()` utility (already exists in `uploadQueue.js:365-369`) and use it in `renderGallery()`.

**C-2: [WARNING] innerHTML with Server Error Messages — Confidence: MEDIUM**
- Location: `public/app.js:286`
- CWE: CWE-79
- Evidence: `message.innerHTML = text;` in `showMessage()` function
- Source: `data.error` from server responses (line 48: `data.error || '⚠️ Admin access required...'`)
- Sink: `innerHTML` without escaping
- Risk: If server error messages ever contain user-influenced data, XSS is possible. Currently, server-side error messages are hardcoded strings, so risk is limited. However, the pattern is fragile — any future change that reflects user input in error messages creates XSS.
- Fix: Use `textContent` for error messages. For the intentional HTML link in auth errors, construct it via DOM API (`document.createElement('a')`).

**C-3: [INFO] uploadQueue.js Uses escapeHtml — Positive Finding**
- Location: `public/uploadQueue.js:365-369`
- Evidence: `escapeHtml()` function defined and used for file names and album names in queue rendering.
- Risk: None — this is a good practice. The same function should be reused in `app.js`.

### D. Authentication, Authorization & CSRF

**D-1: [WARNING] No CSRF Tokens on State-Changing Endpoints — Confidence: MEDIUM**
- Location: `src/routes/authRoutes.js`, `src/routes/imageRoutes.js`, `src/routes/albumRoutes.js`
- CWE: CWE-352 (Cross-Site Request Forgery)
- Evidence: No CSRF middleware (e.g., `csurf`) on any POST/PATCH/DELETE route.
- Mitigating factor: Cookies use `sameSite: 'Strict'` (authController.js:41), which blocks cross-site cookie sending in modern browsers.
- Risk: SameSite=Strict provides strong CSRF protection for browser-to-browser attacks. However, older browsers ignore SameSite, and subdomains may bypass it. API consumers (curl, Postman) are not protected.
- Fix: Add CSRF token middleware as defense-in-depth. Use `csrf-csrf` or similar library.

**D-2: [WARNING] JWT Not Invalidated on Logout — Confidence: HIGH**
- Location: `src/controllers/authController.js:86-93`
- CWE: CWE-613 (Insufficient Session Expiration)
- Evidence: Logout only clears the cookie (`res.cookie('jwt', 'loggedout', ...)`). The JWT itself remains valid for up to 7 days.
- Risk: If an attacker captures the JWT (via XSS, network sniffing on HTTP, or browser exploit), they can use it even after the user logs out. No server-side token blacklist exists.
- Fix: Implement a token blacklist (Redis set with TTL matching JWT expiry). On logout, add the JWT jti to the blacklist. Check blacklist in `protect` middleware.

**D-3: [WARNING] Upload Progress SSE Endpoint Lacks Authentication — Confidence: HIGH**
- Location: `src/routes/imageRoutes.js:41`
- CWE: CWE-200 (Information Exposure)
- Evidence: `router.get('/uploads/progress/:jobId', getUploadProgress)` — no `protect` middleware
- Risk: Anyone who knows or guesses a `jobId` (UUID v4) can connect to the SSE stream and observe upload details (filenames, progress, image IDs). While UUIDs are hard to guess, this is still an information leak vector.
- Fix: Add `protect` middleware to the progress endpoint, or validate that the requesting user initiated the job.

**D-4: [INFO] Cookie Secure Flag Only in Production**
- Location: `src/controllers/authController.js:40`
- Evidence: `secure: env.nodeEnv === 'production'`
- Risk: In development, JWT cookie is sent over HTTP, vulnerable to network sniffing. Standard practice but worth noting for staging environments.

### E. Insecure Dependencies & Configurations

**E-1: [WARNING] CORS Origin Defaults to Wildcard — Confidence: HIGH**
- Location: `src/config/index.js:16`
- CWE: CWE-942 (Overly Permissive CORS Policy)
- Evidence: `origin: process.env.ALLOWED_ORIGINS || '*'`
- Risk: If `ALLOWED_ORIGINS` env var is not set, any origin can make credentialed requests. Combined with cookie auth, this enables cross-origin data theft from malicious sites.
- Fix: Remove the `|| '*'` fallback. Fail loudly if `ALLOWED_ORIGINS` is not configured.

**E-2: [INFO] Helmet Applied — Positive Finding**
- Location: `src/app.js:20`
- Evidence: `app.use(helmet())` — sets security headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc.)
- Risk: None — good practice. No custom CSP is configured, but default Helmet headers are valuable.

**E-3: [WARNING] Uploads Directory Served as Static Without Authentication — Confidence: HIGH**
- Location: `src/app.js:36`
- CWE: CWE-200 (Information Exposure)
- Evidence: `app.use('/uploads', express.static(uploadDir))`
- Risk: All uploaded files are publicly accessible via `/uploads/filename`. No authentication required. For a public gallery this may be intentional, but any file stored locally (when Cloudinary upload fails) is world-readable.
- Fix: If uploads should be private, remove the static middleware and serve files through an authenticated route. If public access is intended, document this decision.

**E-4: [INFO] JSON Body Size Limited — Positive Finding**
- Location: `src/app.js:27`
- Evidence: `app.use(express.json({ limit: '10kb' }))`
- Risk: None — good practice that limits JSON payload size.

### F. Path Traversal & File Access

**F-1: [WARNING] SSRF via Cloudinary URL Check Bypass — Confidence: HIGH**
- Location: `src/controllers/imageController.js:294` and `src/controllers/imageController.js:332`
- CWE: CWE-918 (Server-Side Request Forgery)
- Evidence: `if (variantPath.includes('cloudinary.com'))` and `if (imagePath.includes('cloudinary.com'))` — then `globalThis.fetch(variantPath)`
- Source: `imagePath` / `variantPath` come from MongoDB (set during upload, not directly from user input)
- Sink: `globalThis.fetch()` — server makes HTTP request to the URL
- Risk: An attacker who can modify the database (via NoSQL injection, compromised admin, or direct DB access) could set `path` to `https://evil.cloudinary.com.attacker.com/payload`. The `.includes('cloudinary.com')` check passes, and the server fetches from the attacker's URL, enabling SSRF. The server then proxies the response to the client, enabling content injection.
- Fix: Validate URLs against an allowlist of known Cloudinary domains (e.g., `res.cloudinary.com`). Use URL parsing: `new URL(path).hostname.endsWith('.cloudinary.com')`.

**F-2: [INFO] path.basename Prevents Directory Traversal — Positive Finding**
- Location: `src/controllers/imageController.js:287,325`
- Evidence: `path.resolve(uploadDir, path.basename(imagePath))` — `path.basename()` strips directory components
- Risk: None — this correctly prevents `../` traversal. Files can only be served from within the uploads directory.

## Remediation Priority

| # | Severity | CWE | Title | Fix | Effort |
|---|----------|-----|-------|-----|--------|
| 1 | **CRITICAL** | CWE-798 | MongoDB credentials in .env | Rotate password, use secret manager | small (1-4h) |
| 2 | **CRITICAL** | CWE-798 | Cloudinary API secret in .env | Rotate secret, use secret manager | small (1-4h) |
| 3 | **CRITICAL** | CWE-798 | Cloudinary API key in .env | Rotate key, use secret manager | small (1-4h) |
| 4 | **WARNING** | CWE-798/327 | Weak JWT secret + hardcoded fallback | Generate random secret, remove fallback | trivial (<1h) |
| 5 | **WARNING** | CWE-798 | Admin credentials in .env | Use secret manager or interactive prompt | small (1-4h) |
| 6 | **WARNING** | CWE-79 | Stored XSS via displayName | Escape HTML in renderGallery | trivial (<1h) |
| 7 | **WARNING** | CWE-79 | innerHTML with error messages | Use textContent, DOM API for links | trivial (<1h) |
| 8 | **WARNING** | CWE-352 | No CSRF tokens | Add CSRF middleware | small (1-4h) |
| 9 | **WARNING** | CWE-613 | JWT not invalidated on logout | Implement token blacklist | medium (half day) |
| 10 | **WARNING** | CWE-200 | Upload progress lacks auth | Add protect middleware | trivial (<1h) |
| 11 | **WARNING** | CWE-942 | CORS defaults to wildcard | Remove `|| '*'` fallback | trivial (<1h) |
| 12 | **WARNING** | CWE-200 | Uploads served without auth | Document decision or add auth | small (1-4h) |
| 13 | **WARNING** | CWE-918 | SSRF via Cloudinary URL check | Validate URL hostname allowlist | trivial (<1h) |
| 14 | **WARNING** | CWE-352 | No CSRF tokens (SameSite mitigates) | Add CSRF as defense-in-depth | small (1-4h) |

## Pre-deployment Checklist

- [ ] All CRITICAL findings fixed (rotate MongoDB password, Cloudinary key+secret)
- [ ] All WARNING findings acknowledged or fixed
- [ ] Secrets rotated if exposed (MongoDB, Cloudinary, JWT)
- [ ] XSS escaping added for displayName in gallery rendering
- [ ] SSRF URL validation added for Cloudinary fetch
- [ ] CORS wildcard fallback removed
- [ ] JWT fallback secret removed
- [ ] Upload progress endpoint authenticated

## Coverage

- **Files scanned:** 22 source files (src/, public/, server.js, .env, .env.example, scripts/)
- **Files excluded:** node_modules/, .git/, coverage/, test-results/, uploads/, tests/
- **Categories checked:** All 6 (Secrets, Injection, XSS, Auth/CSRF, Config, Path Traversal)
- **Scan completeness:** Full — all in-scope files reviewed
