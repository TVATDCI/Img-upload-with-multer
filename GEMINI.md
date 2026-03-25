# Gemini CLI: Image Upload API Project Mandates

This document serves as the foundational architectural guide for the Image Upload API project. Adhere strictly to these patterns and structures during all research, strategy, and execution phases.

---

## 🏗️ Architectural Split

### 1. Server-Side (Backend) - `src/`
The backend follows a **Controller-Service-Model** pattern with specialized middleware for authentication and file handling.

- **Models (`src/models/`):** 
    - `Image.js`: Image metadata and storage paths. (Ref: `src/models/Image.js`)
    - `User.js`: User schema with RBAC (Admin/User roles) and hashed passwords. (Ref: `src/models/User.js`)
- **Services (`src/services/`):** 
    - `imageService.js`: DB operations and tiered metadata extraction (Cloudinary API vs. Local `image-size`/`colorthief`). (Ref: `src/services/imageService.js`)
    - `cloudinaryService.js`: Cloudinary SDK wrapper. (Ref: `src/services/cloudinaryService.js`)
- **Controllers (`src/controllers/`):** 
    - `imageController.js`: Image management logic. (Ref: `src/controllers/imageController.js`)
    - `authController.js`: JWT login/logout with secure cookies. (Ref: `src/controllers/authController.js`)
- **Middlewares (`src/middlewares/`):** 
    - `auth.js`: `protect` and `restrictTo` guards. (Ref: `src/middlewares/auth.js`)
    - `upload.js`: Multer configuration. (Ref: `src/middlewares/upload.js`)
    - `errorHandler.js` & `multerError.js`: Global error handling.
- **Utils (`src/utils/`):** 
    - `responseHelper.js`: Standardized API responses (Success, Unauthorized, Forbidden, etc.).

**Mandate:** All full-size image rendering *must* go through the `GET /images/:id/src` proxy.

### 2. Public-Side (Frontend) - `public/`
The frontend is a **Vanilla JS Single-Page Application (SPA)** with Portfolio-Ready UX.

- **State Management (`AppState`):** Centralized state for images, user role, and pagination. (Ref: `public/app.js`)
- **Portfolio UX:** 
    - **Visible Tools:** Administrative buttons remain visible to showcase UI.
    - **Passive Intercept:** `handleAuthError` catch-all in `public/app.js` triggers unauthorized Toasts.
- **Auth UI:** 
    - `login.html`: Secure login portal. (Ref: `public/login.html`)
    - `login.js`: Form submission and CSP compliance. (Ref: `public/login.js`)

---

## 🛠️ Key Technical Patterns

### Authentication & Authorization
- **JWT + Secure Cookies:** Tokens stored in `httpOnly` cookies with `SameSite: Strict`.
- **Role Check:** `restrictTo('admin')` middleware protects destructive routes.
- **CSRF Protection:** Baseline provided by cookie configuration and CORS credentials setup.

### Metadata Intelligence
- **High-Performance Extraction:** Uses `sharp` + `colorthief` for local color extraction and Cloudinary API for cloud-hosted images.

---

## 📜 Development Workflow
- **Linting:** Run `npm run lint` before committing logic changes.
- **Admin Seeding:** Run `node scripts/seedAdmin.js` to initialize the environment. (Ref: `scripts/seedAdmin.js`)

---
*Last Updated: March 24, 2026*
