const API = '/';

const AppState = {
  isLoading: false,
  images: [],
  selectedIds: [],
  viewMode: 'grid',
  searchQuery: '',
  setState(updates) {
    Object.assign(this, updates);
  },
};

const fileInput = document.getElementById('image');
const fileNameEl = document.getElementById('fileName');
const form = document.getElementById('uploadForm');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');
const imageGallery = document.getElementById('image-gallery');
const bulkActionsBar = document.getElementById('bulk-actions-bar');
const searchInput = document.getElementById('search-input');
const viewToggleBtn = document.getElementById('view-toggle');
const selectAllCheckbox = document.getElementById('select-all');

let hideTimer = null;

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getStorageBadge(path) {
  if (path && path.includes('cloudinary.com')) {
    return '<span class="badge badge-cloudinary">Cloudinary</span>';
  }
  return '<span class="badge badge-local">Local</span>';
}

function showMessage(text, type, duration = 5000) {
  if (hideTimer) clearTimeout(hideTimer);
  message.textContent = text;
  message.className = `${type} show`;
  hideTimer = setTimeout(() => {
    message.className = type;
  }, duration);
}

function getFilteredImages() {
  const query = AppState.searchQuery.toLowerCase().trim();
  if (!query) return AppState.images;

  return AppState.images.filter((img) => {
    const filename = img.filename || '';
    const isCloudinary = img.path && img.path.includes('cloudinary.com');
    const storageType = isCloudinary ? 'cloudinary' : 'local';
    return filename.toLowerCase().includes(query) || storageType.includes(query);
  });
}

function renderSkeletons(count = 8) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="image-card skeleton-card">
        <div class="skeleton-shimmer skeleton-image"></div>
        <div class="card-details">
          <div class="skeleton-shimmer skeleton-badge"></div>
          <div class="skeleton-shimmer skeleton-button"></div>
        </div>
      </div>
    `;
  }
  imageGallery.innerHTML = html;
}

function renderGallery(images) {
  imageGallery.innerHTML = '';

  if (!images || images.length === 0) {
    imageGallery.innerHTML = '<p class="empty-state">No images uploaded yet.</p>';
    return;
  }

  images.forEach((img) => {
    const card = document.createElement('div');
    const isSelected = AppState.selectedIds.includes(img._id);
    card.className = `image-card ${isSelected ? 'selected' : ''}`;
    card.id = `img-${img._id}`;
    card.innerHTML = `
      <div class="card-checkbox">
        <input type="checkbox" class="img-checkbox" data-id="${img._id}" ${isSelected ? 'checked' : ''} />
      </div>
      <img src="/images/${img._id}/src" alt="Uploaded image" />
      <div class="card-details">
        <div class="image-meta">${getStorageBadge(img.path)}</div>
        <button
          class="btn-delete"
          data-id="${img._id}"
          aria-label="Delete image"
        >
          Delete
        </button>
      </div>
    `;
    imageGallery.appendChild(card);
  });
}

function updateBulkActionsBar() {
  const count = AppState.selectedIds.length;
  const selectedCountEl = document.getElementById('selected-count');
  const deleteSelectedBtn = document.getElementById('delete-selected-btn');

  if (count > 0) {
    selectedCountEl.textContent = `${count} selected`;
    deleteSelectedBtn.style.display = 'inline-block';
  } else {
    selectedCountEl.textContent = '0 selected';
    deleteSelectedBtn.style.display = 'none';
  }
}

function toggleSelection(id) {
  const idx = AppState.selectedIds.indexOf(id);
  if (idx === -1) {
    AppState.selectedIds.push(id);
  } else {
    AppState.selectedIds.splice(idx, 1);
  }
  updateBulkActionsBar();
}

function toggleSelectAll(checked) {
  const filteredImages = getFilteredImages();
  if (checked) {
    AppState.selectedIds = filteredImages.map((img) => img._id);
  } else {
    AppState.selectedIds = [];
  }
  updateBulkActionsBar();
  renderGallery(filteredImages);
}

async function loadImages() {
  AppState.setState({ isLoading: true });
  renderSkeletons(8);

  try {
    const res = await fetch(`${API}images`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    AppState.setState({ images: data.data || [], selectedIds: [] });
    renderGallery(getFilteredImages());
    updateBulkActionsBar();
  } catch (err) {
    imageGallery.innerHTML =
      '<p class="empty-state">Failed to load images. Is the server running?</p>';
  } finally {
    AppState.setState({ isLoading: false });
  }
}

function optimisticDelete(card, id) {
  const originalCard = card.cloneNode(true);
  card.style.opacity = '0.5';
  card.style.transform = 'scale(0.95)';

  return fetch(`${API}images/${id}`, { method: 'DELETE' })
    .then((res) => res.json())
    .then((data) => {
      if (data.success || res.status === 404) {
        card.remove();
        AppState.images = AppState.images.filter((img) => img._id !== id);
        AppState.selectedIds = AppState.selectedIds.filter((sid) => sid !== id);

        if (AppState.images.length === 0) {
          renderGallery([]);
        }
        showMessage('Image deleted.', 'success', 3000);
        return true;
      } else {
        card.replaceWith(originalCard);
        showMessage(data.error || 'Delete failed.', 'error');
        return false;
      }
    })
    .catch(() => {
      card.replaceWith(originalCard);
      showMessage('Network error.', 'error');
      return false;
    });
}

function deleteSelectedImages() {
  const ids = [...AppState.selectedIds];
  if (ids.length === 0) return;

  if (!window.confirm(`Delete ${ids.length} selected image(s)? This cannot be undone.`)) return;

  const deleteSelectedBtn = document.getElementById('delete-selected-btn');
  deleteSelectedBtn.disabled = true;
  deleteSelectedBtn.textContent = 'Deleting...';

  const cards = ids.map((id) => document.getElementById(`img-${id}`)).filter(Boolean);

  cards.forEach((card) => {
    card.style.opacity = '0.5';
    card.style.transform = 'scale(0.95)';
  });

  const deletePromises = ids.map((id, index) => {
    const card = cards[index];
    if (!card) return Promise.resolve(true);

    return fetch(`${API}images/${id}`, { method: 'DELETE' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success || res.status === 404) {
          card.remove();
          return true;
        }
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
        return false;
      })
      .catch(() => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
        return false;
      });
  });

  Promise.all(deletePromises).then((results) => {
    const successful = results.filter((r) => r).length;
    AppState.images = AppState.images.filter((img) => !ids.includes(img._id));
    AppState.selectedIds = [];

    renderGallery(getFilteredImages());
    updateBulkActionsBar();

    deleteSelectedBtn.disabled = false;
    deleteSelectedBtn.textContent = 'Delete Selected';

    if (successful === ids.length) {
      showMessage(`${successful} image(s) deleted.`, 'success', 3000);
    } else {
      showMessage(`${successful} of ${ids.length} deleted. Some failed.`, 'error');
    }
  });
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];

  if (!file) {
    fileNameEl.textContent = '';
    return;
  }

  const maxSize = 200 * 1024;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (file.size > maxSize) {
    fileNameEl.textContent = `File too large (${formatSize(file.size)}). Max is 200KB.`;
    fileNameEl.style.color = '#ef4444';
    submitBtn.disabled = true;
    return;
  }

  if (!allowedTypes.includes(file.type)) {
    fileNameEl.textContent = `Invalid type (${file.type || 'unknown'}). Use JPEG, PNG, GIF, or WebP.`;
    fileNameEl.style.color = '#ef4444';
    submitBtn.disabled = true;
    return;
  }

  fileNameEl.textContent = `Selected: ${file.name} (${formatSize(file.size)})`;
  fileNameEl.style.color = '#333';
  submitBtn.disabled = false;
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!fileInput.files[0]) {
    showMessage('Please select a file first.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);

  fetch(`${API}uploadImage`, {
    method: 'POST',
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showMessage('Image uploaded successfully!', 'success');
        fileNameEl.textContent = '';
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload';

        if (data.data) {
          AppState.images = [data.data, ...AppState.images];
          renderGallery(getFilteredImages());
        } else {
          loadImages();
        }
      } else {
        showMessage(data.error || 'Upload failed.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload';
      }
    })
    .catch(() => {
      showMessage('Network error. Is the server running?', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload';
    });
});

searchInput.addEventListener('input', (e) => {
  AppState.searchQuery = e.target.value;
  renderGallery(getFilteredImages());
});

viewToggleBtn.addEventListener('click', () => {
  AppState.viewMode = AppState.viewMode === 'grid' ? 'list' : 'grid';
  viewToggleBtn.textContent =
    AppState.viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
  imageGallery.className = AppState.viewMode === 'list' ? 'list-view' : '';
  renderGallery(getFilteredImages());
});

selectAllCheckbox.addEventListener('change', (e) => {
  toggleSelectAll(e.target.checked);
});

imageGallery.addEventListener('click', (e) => {
  const checkbox = e.target.closest('.img-checkbox');
  if (checkbox) {
    const id = checkbox.dataset.id;
    toggleSelection(id);
    const card = document.getElementById(`img-${id}`);
    if (card) {
      card.classList.toggle('selected', checkbox.checked);
    }
    const allCheckboxes = imageGallery.querySelectorAll('.img-checkbox');
    const filteredImages = getFilteredImages();
    selectAllCheckbox.checked =
      allCheckboxes.length > 0 &&
      Array.from(allCheckboxes).every((cb) => cb.checked) &&
      allCheckboxes.length === filteredImages.length;
    return;
  }

  const btn = e.target.closest('.btn-delete');
  if (!btn) return;

  const id = btn.dataset.id;
  const card = document.getElementById(`img-${id}`);
  if (!card) return;

  if (!window.confirm('Delete this image? This cannot be undone.')) return;

  btn.disabled = true;
  btn.textContent = 'Deleting...';

  optimisticDelete(card, id).then(() => {
    updateBulkActionsBar();
  });
});

loadImages();
