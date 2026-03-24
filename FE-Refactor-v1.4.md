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

# 🛠 Technical Requirements

## 1. Backend: Metadata Extraction (src/)

- **Schema Update**: Enhance `Image.js` to include:
  - `dimensions`: { width: Number, height: Number }
  - `tags`: [String] (AI-generated labels, optional)
  - `colors`: [String] (Array of 6 dominant Hex codes)
  - `fileType`: String (e.g., 'image/png')
- **Upload Controller**:
  - Update `imageController.js` to extract width/height during upload.
  - If using Cloudinary: Enable `colors: true` in the upload call. Skip tags for graceful degradation (premium add-on).
  - If Local: Use `image-size` library for dimensions, `color-thief-node` for colors. Leave tags empty.
- **Search Logic**: Update `GET /images` to allow partial matches within the `tags` array.

## 2. Frontend: The "Inspector" Modal (public/)

- **Split-View Lightbox**:
  - Update the modal in `index.html` to a two-column layout.
  - Left Column: Image preview (using the `/images/:id/src` proxy).
  - Right Column (Sidebar):
    - **Info Section**: Show Display Name, Original Name, and Upload Date.
    - **Technical Section**: Show Dimensions (px), File Size (KB/MB), and MIME type.
    - **AI Section**: Render `tags` as clickable chips and `colors` as a row of 6 interactive swatches.
- **Action Bar**: Add buttons to the sidebar for "Download", "Copy Proxy Link", and "Rename".

## 3. Frontend: Logic & Search (public/app.js)

- **Tag Filtering**: Implement a function where clicking an AI tag chip shows a dropdown to filter the gallery by that tag.
- **Dynamic Swatches**: Render 6 small color circles on the main gallery cards to show the "vibe" of the image before opening it.

# 🎨 UI/UX Specifications

- **Modal Transitions**: Use a smooth "Scale + Fade" entrance for the Lightbox.
- **Sidebar Styling**: Use a slightly darker, semi-transparent background (`backdrop-filter: blur`) for the Inspector sidebar to distinguish it from the preview.
- **Responsiveness**: On mobile, move the Sidebar metadata _below_ the image preview.

# ⚠️ Constraints

- Maintain the 'AppState' pattern for tracking the "active" image in the modal.
- Use existing CSS variables for all colors and spacing.
- Ensure 'Optimistic UI' principles apply if the user renames the image from the inspector.
- Only new uploads get metadata; existing images keep empty/null fields gracefully.
