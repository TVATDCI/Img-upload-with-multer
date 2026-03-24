# Authorization.md: Backend Security & Admin Protection

## 🎯 Objectives

1. Implement a **User Model** with role-based access (User/Admin).
2. Create **JWT Authentication** using `httpOnly` cookies for secure session management.
3. Protect **destructive/creative routes** (Upload, Delete, Rename) so only the Admin can execute them.
4. Implement a **Frontend Intercept** that detects 401/403 errors and guides users to a login page.

---

## Step 1: Dependencies & Configuration

**Task:** Install security packages and update `.env`.

- Run: `npm install bcryptjs jsonwebtoken cookie-parser`
- Add to `.env`:
  - `JWT_SECRET=your_super_secret_random_string`
  - `JWT_EXPIRES_IN=7d`
  - `ADMIN_EMAIL=your_email@example.com`

---

## 🏗 Step 2: Backend Implementation (src/)

### 2.1 User Model (`src/models/User.js`)

Create a schema for users.

- **Fields:** `email` (unique, lowercase), `password` (select: false), `role` (enum: ['user', 'admin'], default: 'user').
- **Pre-save Hook:** Hash the password using `bcryptjs` before saving.
- **Method:** `correctPassword` to compare candidate passwords with the hashed version.

### 2.2 Auth Middleware (`src/middlewares/auth.js`)

Create the "Bouncer" logic.

- **`protect`**: Extract the JWT from the `cookies`. Verify it. If valid, attach the user to `req.user`.
- **`restrictTo(...roles)`**: Check if `req.user.role` matches the required roles (e.g., 'admin'). If not, return `403 Forbidden`.

### 2.3 Auth Controller (`src/controllers/authController.js`)

Handle the login flow.

- **`login`**: Check email/password. Generate JWT.
- **Cookie Setup:** Send the JWT via an `httpOnly`, `Secure` (in production), `SameSite=Strict` cookie.
- **`logout`**: Clear the cookie.

### 2.4 Route Protection (`src/routes/imageRoutes.js`)

Apply the protection.

- Import `protect` and `restrictTo` from the auth middleware.
- **Apply to:** `POST /uploadImage`, `DELETE /images/:id`, `DELETE /images/batch`, and `PATCH /images/:id`.
- **Example:** `router.delete('/:id', protect, restrictTo('admin'), deleteImage);`

---

## 🌐 Step 3: Frontend "Passive Intercept" (`public/app.js`)

**Task:** Update the global fetch handler or individual action functions.

- Every function that performs a `POST`, `DELETE`, or `PATCH` must check the response status.
- **Logic:**

  ```javascript
  if (response.status === 401 || response.status === 403) {
    showToast(
      '⚠️ Admin access required. Please <a href="/login.html" style="color:white; text-decoration:underline;">login here</a> to manage assets.',
      'error'
    );
    return;
  }
  ```

---

## 📜 Step 4: Security Mandates for Agent

1. **No Password Leakage:** Ensure the `password` field in the User model is always set to `select: false`.
2. **Cookie Security:** The JWT cookie must be `httpOnly: true` to prevent XSS attacks.
3. **Graceful Failures:** If a user tries to delete an image without being logged in, the UI must stay in sync (do not remove the card if the server returns 401).
4. **Environment Awareness:** Centralize the `JWT_SECRET` in `src/config/index.js`.

---

## 🧪 Testing Protocol

1. **Initial Seed:** Create your Admin user via Postman (since registration is disabled in the UI).
2. **Unauthorized Test:** Attempt to delete an image without logging in. Verify the Toast appears with the login link and the image remains in the gallery.
3. **Authorized Test:** Log in via `/login.html`, then verify you can upload/delete as normal.

---

"Implemented Role-Based Access Control (RBAC) and secure JWT-cookie authentication"

## The source files

Concrete implementation code for the **User Model**, **Auth Controller**, and a professional **Login Page**.

### 1. The Data Structure (`src/models/User.js`)

This model ensures passwords are never leaked in API responses and are always hashed before storage.

```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false, // Prevents password from being returned in queries
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model('User', userSchema);
export default User;
```

### 2. The Logic Layer (`src/controllers/authController.js`)

This handles the secure `httpOnly` cookie delivery.

```javascript
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }

  createSendToken(user, 200, res);
};

export const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
```

### 3. The Entry Point (`public/login.html`)

This page uses the existing project's CSS variables to ensure the design remains consistent.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Login | Asset Manager</title>
    <link rel="stylesheet" href="styles.css" />
    <style>
      .login-container {
        max-width: 400px;
        margin: 100px auto;
        padding: 2rem;
        background: var(--bg-card);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        border: 1px solid var(--border-color);
      }
      .form-group {
        margin-bottom: 1.5rem;
      }
      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        color: var(--text-secondary);
      }
      .form-group input {
        width: 100%;
        padding: 0.75rem;
        background: var(--bg-input);
        border: 1px solid var(--border-color);
        color: var(--text-main);
        border-radius: var(--radius-md);
      }
      .btn-login {
        width: 100%;
        padding: 0.75rem;
        background: var(--color-primary);
        color: white;
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="login-container">
      <h2>Admin Login</h2>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">Access management tools</p>
      <form id="loginForm">
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="email" required placeholder="admin@example.com" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="password" required placeholder="••••••••" />
        </div>
        <button type="submit" class="btn-login">Login to Dashboard</button>
      </form>
      <p id="message" style="margin-top: 1rem; text-align: center; font-size: 0.9rem;"></p>
    </div>

    <script>
      document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const msg = document.getElementById('message');

        try {
          const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (res.ok) {
            msg.style.color = 'var(--color-success)';
            msg.innerText = 'Login successful! Redirecting...';
            setTimeout(() => (window.location.href = '/'), 1500);
          } else {
            msg.style.color = 'var(--color-danger)';
            msg.innerText = 'Invalid credentials or permission denied.';
          }
        } catch (err) {
          msg.innerText = 'Server error. Please try again.';
        }
      });
    </script>
  </body>
</html>
```

### Final Instructions

1. **Task: Route Aggregation** — Ensure `app.js` (backend) uses `cookieParser()` and routes `/auth` requests to the `authController`.
2. **Task: Seed Admin** — Create a temporary script or Postman collection to create the initial user with `role: 'admin'`.
3. **Task: Global Error Intercept** — Wrap the frontend `fetch` calls in a helper that automatically detects a 401 status and triggers the login Toast.

This setup should creates a completely "closed loop" for the admin features while keeping the public gallery open and interactive for viewers.
