### Lightbox-Image UI/UX Definition

1. **Cursor Feedback**: Change the cursor to a `pointer` when hovering over the image to signal that it is clickable.
2. **Hover State**: Apply a subtle visual change to the card on hover (translateY and shadow) to confirm interactivity.
3. **Instructional Tooltip**: Add a `title` attribute to the image element so a "Click to preview" tooltip appears when the user lingers over it.
4. **Accessibility**: Add an `aria-label` to the image to ensure screen-reader users are also informed that the image triggers a preview modal.

---

# Asset Inspector (Lightbox) UI/UX Specification

## 1. Visual Affordance & Interactivity
To signal that images are interactive and part of the "Inspection" system:
- **Cursor**: `pointer` on image hover.
- **Card Feedback**: The entire `.image-card` lifts (`translateY(-4px)`) and gains a deeper shadow on hover.
- **Tooltip**: `title="[Display Name]"` attribute provides a native browser tooltip.
- **Accessibility**: `aria-label="Click to open full-size preview"` ensures screen-reader compatibility.

## 2. The Asset Inspector (Split-View)
The Lightbox has evolved into a two-column "Asset Inspector":

### Left Pane: Preview
- **Dynamic Proxy**: Always loads via `/images/:id/src` for consistency.
- **Navigation**: Persistent Next/Prev buttons + Keyboard support (Arrow keys).
- **Animation**: Smooth `scale-fade-in` entrance (0.3s).

### Right Pane: Technical Sidebar
- **Metadata Section**: Displays Display Name, Original Name, and Upload Date.
- **Technical Section**: Displays Dimensions (WxH), File Size (formatted), and MIME type.
- **Color Palette**: Displays 6 dominant colors. Clicking a swatch copies the Hex code to the clipboard.
- **AI Tags**: Displays clickable chips. Clicking a tag closes the inspector and filters the gallery by that tag.
- **Contextual Actions**:
    - **Download**: Direct trigger for image download.
    - **Copy Proxy**: Copies the permanent backend URL to the clipboard.
    - **Rename**: Triggers an optimistic UI rename prompt.

## 3. Implementation Status (Phase 3)
| Feature | Status | Notes |
| :--- | :--- | :--- |
| Cursor Feedback | ✅ Active | Applied to `.image-card img` |
| Hover State | ⚠️ Modified | Card-level lift used instead of image-only zoom |
| Native Tooltip | ✅ Active | Dynamically set to Display Name |
| ARIA Labels | ✅ Active | Set on all interactive elements |
| Sidebar Info | ✅ Active | Fully integrated with AppState |
| Navigation | ✅ Active | Mouse and Keyboard (Esc, Left, Right) |

---
*Last Updated: March 24, 2026*
