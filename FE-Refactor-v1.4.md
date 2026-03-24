# Implementation Research & Architecture

1. **The Asset Inspector Layout**
   Standard DAM (Digital Asset Management) tools use a "Preview + Metadata" split. This allows the user to look at the image while reading the technical specs.

2. **Capturing AI Metadata**

- Dimensions: Essential for developers to know if an asset is high-res enough for specific UI components.

- AI Tags: Allows for "Semantic Search." A user can search for "Forest" even if the filename is IMG_842.jpg.

- Color Palette: Useful for designers to find images that match a specific brand color or UI theme.

3. Logic: The Proxy Requirement
   For the Lightbox/Inspector, we must strictly use the GET /images/:id/src endpoint. This ensures that even if an image is stored in a private Cloudinary bucket or a protected local folder, the frontend can always render it consistently through our backend proxy.

## Role

Senior Full-Stack Engineer. Implement Phase 3: "Intelligence & Inspection."

## 🎯 Objectives

1. AI Data Enrichment: Auto-tagging and color palette extraction on upload.
2. Asset Inspector: A professional split-view Lightbox with a technical metadata sidebar.
3. Smart Filtering: Search and filter by AI tags and hex color codes.

## 📋 Decisions Made

| Decision         | Choice            | Notes                                                                                                        |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| AI Tags          | Graceful fallback | Only enable tags for Cloudinary uploads; skip for local fallback; leave field empty/null for existing images |
| Color count      | 6                 | Extract 6 dominant colors per image                                                                          |
| Tag filtering UI | Dropdown          | Clicking tag shows dropdown with filter options                                                              |
| Existing images  | Not updated       | Only new uploads will have metadata; existing images keep empty fields                                       |

---

## ✅ Implementation Status

### Backend (src/)

- [x] **Schema Update**: Added `dimensions`, `tags[]`, `colors[]`, `fileType` fields
- [x] **Metadata Extraction**:
  - Cloudinary: Gets dimensions and colors from API (`colors: true`)
  - Local: Uses `image-size` for dimensions, `colorthief` for colors
- [x] **Search Logic**: Updated to search tags

### Frontend (public/)

- [x] **Split-View Lightbox**: Two-column layout with sidebar
- [x] **Info Section**: Display Name, Original Name, Upload Date
- [x] **Technical Section**: Dimensions, File Size, MIME type
- [x] **Colors Section**: 6 clickable swatches (click to copy hex)
- [x] **Tags Section**: Clickable chips to filter gallery
- [x] **Action Buttons**: Download, Copy Proxy Link, Rename
- [x] **Color Swatches on Cards**: 6 small dots showing image colors
- [x] **Tag Filtering**: Click tag to filter gallery
- [x] **Modal Animation**: Scale + Fade entrance
- [x] **Responsive**: Sidebar below image on mobile

---

## 🔧 Technical Details

### New Dependencies

- `image-size` - Extract image dimensions from local files
- `colorthief` - Extract dominant colors from images

### Image Schema

```javascript
{
  dimensions: { width: Number, height: Number },
  tags: [String],
  colors: [String],  // 6 hex codes
  fileType: String
}
```

### API Changes

- `POST /uploadImage` now returns `dimensions`, `colors`, `fileType` in response

---

## ⚠️ Constraints (Met)

- ✅ Maintained 'AppState' pattern
- ✅ Used existing CSS variables
- ✅ Optimistic UI for rename
- ✅ Graceful fallback for existing images

---

## Future Enhancements (Phase 4)

- TensorFlow.js for local AI tagging
- Cloudinary premium auto-tagging
- Color-based filtering UI
- Image editing (crop, rotate)
