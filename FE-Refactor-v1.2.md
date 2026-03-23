# Refactor plan for image upload project into an **Enterprise Asset Manager**

I have drafted a structured implementation plan. You can copy directly execute the code updates as plan

### 📝 Prompt for Agent: Enterprise Asset Manager Refactor

```markdown
# Role

Senior Frontend Engineer. Refactor the current Image Upload API frontend (public/app.js, public/styles.css, and public/index.html) into a professional "Enterprise Asset Manager" style UI.

# Objectives

1. Implement Bulk Actions: Allow users to select multiple images and delete them in one request.
2. Improve Perceived Performance: Implement Skeleton Screens and Optimistic UI.
3. Enhance UX: Add a "List/Grid" toggle and a search filter.

# Technical Requirements

## 1. State Management (public/app.js)

- Update `AppState` to include `selectedIds: []` and `viewMode: 'grid'`.
- Implement an "Optimistic Delete" function: hide the card immediately from the DOM and only show an error/restore the card if the server-side DELETE fails.
- Create a `deleteSelectedImages()` function that iterates through `selectedIds` and calls the DELETE endpoint for each.

## 2. UI Components (public/index.html & app.js)

- Add a "Bulk Actions" bar at the top of the gallery that only appears when images are selected.
- Add a checkbox to each `.image-card`.
- Implement a Search Input to filter the `AppState.images` by filename or storage type (Cloudinary/Local) locally.
- Add a toggle button to switch between `.grid-view` and `.list-view`.

## 3. Recommended "Quick Wins" (CSS & JS)

- **Skeleton Screens**: Create a CSS animation `.skeleton-shimmer` and a JS function `renderSkeletons(count)` to display 4-8 placeholder cards while `isLoading` is true.
- **Micro-interactions**: Use CSS transitions for the selection checkboxes and hover states.

## 4. Styling (public/styles.css)

- Add CSS Variables for:
  --color-selection: #e0f2fe;
  --color-skeleton: #e5e7eb;
- Create `.list-view` styles: high-density rows instead of cards.
- Create the `.skeleton-shimmer` keyframe animation:
  @keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
  }

# Implementation Task

Please modify the files to implement these features while maintaining the existing 'AppState' pattern and serving logic. Ensure the 'Delete' confirmation still works for single deletions, but perhaps skip it for bulk if the user chooses.
```

---

### Strategy Breakdown for Our Debugging Phase

Once the prompt above is executed, here is what we will be looking for in our follow-up session:

1.  **State Sync:** We need to ensure that when an image is deleted optimistically, the `AppState.images` array is correctly filtered so the "Empty State" message triggers if the last image is removed.
2.  **Bulk Request Efficiency:** Currently, your backend handles one deletion at a time (`DELETE /images/:id`). If you delete 10 images at once, the agent will likely trigger 10 fetch calls. We should check if this causes rate-limiting issues since you have `express-rate-limit` active on the backend.
3.  **Visual Consistency:** We will check the `.list-view` implementation to ensure the "Cloudinary" and "Local" badges still align correctly within a row format instead of a card format.

**Does this plan look ready and understandable for you, or would you like to adjust the "Bulk Actions" logic first?**
