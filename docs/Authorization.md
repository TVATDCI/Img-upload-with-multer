# Authorization.md: Portfolio-Ready Admin Protection (RBAC)

## 🎯 Objectives

1.  **User Model**: ✅ Complete. Role-based (User/Admin) with secure hashing.
2.  **JWT Authentication**: ✅ Complete. Secure `httpOnly` cookies with `SameSite: Strict`.
3.  **Route Protection**: ✅ Complete. Destructive/creative routes guarded by Admin-only logic.
4.  **Portfolio UI Strategy**: ✅ Complete. Administrative buttons remain visible with passive "Unauthorized" Toasts.
5.  **Seeding Script**: ✅ Complete. `scripts/seedAdmin.js` implemented for one-click setup.

---

## Step 1: Dependencies & Configuration

**Task:** Install security packages and update `.env`.

- Run: `npm install bcryptjs jsonwebtoken cookie-parser sharp` (Sharp added for color extraction fallback)
- Add to `.env`:
  - `JWT_SECRET=your_super_secret_random_string`
  - `JWT_EXPIRES_IN=7d`
  - `ADMIN_EMAIL=admin@example.com`
  - `ADMIN_PASSWORD=your_secure_password`

---

## 🏗 Step 2: Backend Implementation (src/)

### 2.1 User Model (`src/models/User.js`)
- **Status**: ✅ Complete. 
- **Details**: Uses `pre-save` async hook for `bcryptjs` hashing (Cost factor: 12).

### 2.2 Auth Middleware (`src/middlewares/auth.js`)
- **Status**: ✅ Complete. 
- **Guards**: 
    - `protect`: Verifies JWT from cookie. 
    - `restrictTo('admin')`: Rejects non-admin attempts with `403 Forbidden`.

### 2.3 Route Protection (`src/routes/imageRoutes.js`)
- **Status**: ✅ Complete. 
- **Protected Routes**: 
    - `POST /uploadImage`
    - `PATCH /images/:id/displayName`
    - `DELETE /images/:id`
    - `DELETE /images/batch`

---

## 🌐 Step 3: Frontend "Portfolio Intercept" (`public/app.js`)

**Status**: ✅ Complete.

- **Login UI**: `login.html` and `login.js` implemented for CSP-compliant authentication.
- **Global Interceptor**: `handleAuthError` helper in `public/app.js` catches 401/403 and rollbacks Optimistic UI changes while triggering a Toast.
- **Auth Status Check**: `checkAuthStatus()` runs on gallery load to update UI with user info.

---

## 🛠 Step 4: Seeding Script (`scripts/seedAdmin.js`)

**Status**: ✅ Complete.

**Usage**:
```bash
node scripts/seedAdmin.js
```
This script handles both the creation of a new admin and the resetting of passwords for existing admin accounts.

---

## 📜 Security Mandates (Met)
1.  **No Password Leakage**: `select: false` enforced in schema.
2.  **Cookie Security**: `httpOnly: true` and `SameSite: Strict` configured in `authController.js`.
3.  **CSP Compliance**: Inline scripts removed in favor of external files for the login portal.
4.  **Route Order**: Batch delete route reordered to prevent ID conflicts.

---

## 🧪 Testing Protocol (Verified)
1.  **Guest Experience**: Users can view the gallery, open the Asset Inspector, and see management buttons. Clicking "Delete" triggers the "Admin required" Toast.
2.  **Admin Experience**: Logging in enables all management features.
3.  **Logout Experience**: Session cleared, UI reverts to guest state.

---
*Implementation Finalized: March 24, 2026*
