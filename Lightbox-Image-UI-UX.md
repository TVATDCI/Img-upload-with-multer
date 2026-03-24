### Lightbox-Image UI/UX deffinition

1. **Cursor Feedback**: Change the cursor to a `pointer` when hovering over the image to signal that it is clickable.
2. **Hover State**: Apply a subtle visual change to the image on hover, such as a slight zoom or a brightness adjustment, to confirm interactivity.
3. **Instructional Tooltip**: Add a `title` attribute to the image element so a "Click to preview" tooltip appears when the user lingers over it.
4. **Accessibility**: Add an `aria-label` to the image to ensure screen-reader users are also informed that the image triggers a preview modal.

---

### Image Interactivity & UX Affordance

```markdown
# Role

Senior Frontend Engineer

# Task: Enhance Image Interactivity UI/UX

Improve the user's awareness of the Lightbox feature by adding visual and functional cues to the image gallery.

# Technical Requirements

## 1. CSS Updates (public/styles.css)

- Update the `.image-card img` selector:
  - Add `cursor: pointer;` to indicate the element is interactive.
  - Implement a hover effect: use `transition: transform 0.2s ease, filter 0.2s ease;`.
  - On `:hover`, apply `filter: brightness(0.85);` and a subtle `transform: scale(1.02);`.

## 2. Rendering Updates (public/app.js)

- Modify the `renderGallery` or `loadImages` function where the `<img>` tag is generated:
  - Add `title="Click to preview"` to the `<img>` tag to provide a native browser tooltip.
  - Add `aria-label="Click to open full-size preview"` to the `<img>` tag for accessibility compliance.

# Constraints

- Ensure the hover effect does not interfere with the checkbox or the delete button functionality.
- Maintain the existing CSS variable system for all transitions and colors.
- Follow the "No Silent Failures" rule: if the Lightbox fails to trigger for any reason, ensure a Toast notification is logged.
```

By adding these small details, the project should feel more "intuitive," than just "functional"
