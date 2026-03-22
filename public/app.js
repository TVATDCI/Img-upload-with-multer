const API = '/';

const AppState = {
  isLoading: false,
  images: [],
  message: { text: '', type: '' },

  setState(updates) {
    Object.assign(this, updates);
    console.log('[AppState] Updated:', JSON.parse(JSON.stringify(updates)));
  },
};

const fileInput = document.getElementById('image');
const fileNameEl = document.getElementById('fileName');
const form = document.getElementById('uploadForm');
const message = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');
const imageGallery = document.getElementById('image-gallery');

let hideTimer = null;
let uploadAbortController = null;

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
  console.log(`[Notification] ${type.toUpperCase()}: ${text}`);
  hideTimer = setTimeout(() => {
    message.className = type;
  }, duration);
}

function renderGallery(images) {
  imageGallery.innerHTML = '';

  if (!images || images.length === 0) {
    imageGallery.innerHTML = '<p class="empty-state">No images uploaded yet.</p>';
    return;
  }

  images.forEach((img) => {
    console.log('[renderGallery] Rendering image:', { _id: img._id, filename: img.filename, path: img.path });
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `img-${img._id}`;
    card.innerHTML = `
      <img src="${img.path}" alt="${img.filename}" loading="lazy" />
      <div class="card-details">
        <div>
          <p class="image-name">${img.filename}</p>
          <div class="image-meta">${getStorageBadge(img.path)}</div>
        </div>
        <button
          class="btn-delete"
          data-id="${img._id}"
          aria-label="Delete image ${img.filename}"
        >
          Delete
        </button>
      </div>
    `;
    imageGallery.appendChild(card);
  });
}

async function loadImages() {
  AppState.setState({ isLoading: true });
  renderGallery([]);
  imageGallery.innerHTML = '<p class="loading-state"><span class="spinner"></span><br />Loading images...</p>';

  try {
    const res = await fetch(`${API}images`);
    const data = await res.json();
    console.log('[GET /images] Response:', res.status, data);

    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    AppState.setState({ images: data.data || [] });
    renderGallery(AppState.images);
    console.log(`[Health Check] Connected — ${AppState.images.length} image(s) loaded.`);
  } catch (err) {
    console.error('[GET /images] Error:', err);
    imageGallery.innerHTML = '<p class="empty-state">Failed to load images. Is the server running?</p>';
  } finally {
    AppState.setState({ isLoading: false });
  }
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
  console.log('[Upload Started]');

  if (!fileInput.files[0]) {
    showMessage('Please select a file first.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);

  uploadAbortController = new AbortController();

  fetch(`${API}uploadImage`, {
    method: 'POST',
    body: formData,
    signal: uploadAbortController.signal,
  })
    .then((res) => res.json())
      .then((data) => {
      console.log('[Upload Response]', data);
      console.log('[Upload Response] data.data.path:', data.data?.path);
      console.log('[Upload Response] data.data.publicId:', data.data?.publicId);

      if (data.success) {
        showMessage('Image uploaded successfully!', 'success');
        fileNameEl.textContent = '';
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload';

        if (data.data) {
          AppState.images = [data.data, ...AppState.images];
          renderGallery(AppState.images);
        }
      } else {
        showMessage(data.error || 'Upload failed.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload';
      }
    })
    .catch((err) => {
      if (err.name === 'AbortError') {
        console.log('[Upload] Cancelled.');
        return;
      }
      console.error('[Upload] Error:', err);
      showMessage('Network error. Is the server running?', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload';
    });
});

imageGallery.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;

  const id = btn.dataset.id;
  const card = document.getElementById(`img-${id}`);
  if (!card) return;

  if (!window.confirm('Delete this image? This cannot be undone.')) return;

  console.log(`[Delete] Starting — ID: ${id}`);
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  fetch(`${API}images/${id}`, { method: 'DELETE' })
    .then((res) => res.json())
    .then((data) => {
      console.log('[Delete Response]', data);

      if (data.success || res.status === 404) {
        card.remove();
        AppState.images = AppState.images.filter((img) => img._id !== id);

        if (AppState.images.length === 0) {
          renderGallery([]);
        }
        showMessage('Image deleted.', 'success', 3000);
      } else {
        showMessage(data.error || 'Delete failed.', 'error');
        btn.disabled = false;
        btn.textContent = 'Delete';
      }
    })
    .catch((err) => {
      console.error('[Delete] Error:', err);
      showMessage('Network error.', 'error');
      btn.disabled = false;
      btn.textContent = 'Delete';
    });
});

loadImages();
