# Image Upload API

A production-ready Express.js image upload API with MongoDB storage and Cloudinary cloud storage. Developed from a student project through enterprise-grade enhancements.

## 📚 Version History

| Version                                                                 | Description                                                        | Date      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ | --------- |
| [v1.0](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1)       | Basic image upload with Multer + MongoDB                           | Original  |
| [v1.1.x](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1.1)   | Cloudinary integration with local fallback                         | Phase 1   |
| [v1.1.3](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1.1.3) | Enterprise features: batch delete, pagination, lightbox            | Phase 2   |
| [v1.2](https://github.com/TVATDCI/Img-upload-with-multer/tree/v1.2)     | Advanced metadata: size, displayName, sorting                      | Phase 2.1 |
| [v1.3](https://github.com/TVATDCI/Img-upload-with-multer/tree/main)     | Asset Inspector: dimensions, colors, AI metadata, split-view modal | Phase 3   |
| **v1.4 (Current)**                                                      | **Admin Authorization: JWT, RBAC, Secure Cookies, Portfolio Mode** | **Phase 4**   |

---

## Tech Stack

- **Express.js** — Web framework
- **Multer** — File upload middleware
- **Mongoose** — MongoDB ODM
- **Cloudinary** — Cloud image storage (with local fallback)
- **Helmet** — Security headers
- **express-rate-limit** — Upload rate limiting
- **ESLint + Prettier** — Code linting and formatting
- **image-size** — Extract image dimensions
- **colorthief** — Extract dominant colors
- **sharp** — High-performance image processing (for color extraction)
- **bcryptjs** — Password hashing
- **jsonwebtoken** — Authentication tokens
- **cookie-parser** — Secure cookie handling

---

## Project Structure

```
src/
├── config/
│   ├── index.js           # Environment config (centralized)
│   └── database.js        # MongoDB connection
├── controllers/
│   ├── imageController.js # HTTP request/response handlers
│   └── authController.js  # JWT login/logout logic (NEW)
├── services/
│   ├── imageService.js    # Business logic (DB + file operations)
│   └── cloudinaryService.js # Cloudinary upload/delete
├── models/
│   ├── Image.js           # Mongoose image schema
│   └── User.js            # User schema with RBAC (NEW)
├── routes/
│   ├── index.js           # Route aggregator
│   ├── imageRoutes.js     # API route definitions
│   └── authRoutes.js      # Auth endpoints (NEW)
├── middlewares/
│   ├── upload.js          # Multer configuration
│   ├── auth.js            # protect & restrictTo guards (NEW)
│   ├── errorHandler.js    # Global error handler
│   └── multerError.js     # Multer error mapper
└── utils/
    ├── fileUtils.js       # File cleanup helpers
    └── responseHelper.js  # Standardized API responses

public/                    # Frontend (served at /)
├── index.html            # HTML structure
├── login.html            # Admin login page (NEW)
├── styles.css            # Styles with CSS variables
├── app.js               # Gallery logic with Auth Interceptor
└── login.js             # Login form logic (NEW)

scripts/
└── seedAdmin.js          # Admin account creation script (NEW)

server.js                 # Entry point
app.js                    # Express app setup
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable                | Description                                   |
| ----------------------- | --------------------------------------------- |
| `MONGO_URI`             | MongoDB connection string (local or Atlas)    |
| `PORT`                  | Server port (default: 3001)                   |
| `JWT_SECRET`            | Secret key for signing tokens                 |
| `ADMIN_EMAIL`           | Initial admin email                           |
| `ADMIN_PASSWORD`        | Initial admin password                        |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                         |
| `CLOUDINARY_API_KEY`    | Cloudinary API key                            |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret                         |

### 3. Seed Admin User

```bash
node scripts/seedAdmin.js
```

### 4. Start the server

```bash
npm start
```

---

## API Endpoints

| Method | Endpoint                  | Access | Description                  |
| ------ | ------------------------- | ------ | ---------------------------- |
| POST   | `/auth/login`             | Public | Admin login (sets cookie)    |
| POST   | `/auth/logout`            | Public | Clear auth cookie            |
| GET    | `/images`                 | Public | Paginated image list         |
| GET    | `/images/:id/src`         | Public | Image proxy for lightbox     |
| POST   | `/uploadImage`            | Admin  | Upload an image (max 200KB)  |
| PATCH  | `/images/:id/displayName` | Admin  | Update display name          |
| DELETE | `/images/:id`             | Admin  | Delete single image          |
| DELETE | `/images/batch`           | Admin  | Batch delete multiple images |

---

## Features

### Role-Based Access Control (RBAC)
- **Portfolio Mode**: All admin buttons (Upload, Delete, Rename) remain visible for demonstration purposes.
- **Secure Interaction**: Attempting an admin action as a guest triggers a "Passive Intercept" which displays an "Unauthorized" Toast with a login link.
- **JWT Storage**: Tokens are stored in `httpOnly` cookies with `SameSite: Strict` to prevent XSS and CSRF attacks.

### Metadata Intelligence
- **Dimensions**: Width × Height extracted on upload.
- **Colors**: 6 dominant colors extracted automatically (via Sharp + Colorthief).
- **Asset Inspector**: Professional split-view lightbox with technical metadata sidebar.

---

## License

MIT
