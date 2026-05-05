/**
 * Upload Queue Module
 * Handles drag-and-drop, file validation, preview generation, and batch submission
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 200 * 1024; // 200KB

let queueFiles = [];
let currentJobId = null;
let eventSource = null;

// DOM Elements (will be initialized on load)
let dropZone = null;
let fileInput = null;
let queueContainer = null;
let albumSelect = null;
let watermarkInput = null;
let submitBatchBtn = null;
let batchProgressContainer = null;
let overallProgressBar = null;
let overallProgressText = null;

export function initUploadQueue() {
  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('batch-file-input');
  queueContainer = document.getElementById('upload-queue');
  albumSelect = document.getElementById('album-select');
  watermarkInput = document.getElementById('watermark-input');
  submitBatchBtn = document.getElementById('submit-batch-btn');
  batchProgressContainer = document.getElementById('batch-progress');
  overallProgressBar = document.getElementById('overall-progress-bar');
  overallProgressText = document.getElementById('overall-progress-text');

  if (!dropZone || !fileInput) return;

  // Drag and drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  });

  // File input fallback
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
    fileInput.value = ''; // Reset for re-selection
  });

  // Submit batch
  submitBatchBtn?.addEventListener('click', submitBatch);

  // Load albums for selector
  loadAlbums();
}

export function addFiles(files) {
  for (const file of files) {
    const validation = validateFile(file);
    queueFiles.push({
      file,
      id: crypto.randomUUID(),
      status: validation.valid ? 'pending' : 'rejected',
      error: validation.error,
      previewUrl: null,
      progressPercent: 0,
    });

    if (validation.valid) {
      generatePreview(queueFiles[queueFiles.length - 1]);
    }
  }

  renderQueue();
  updateSubmitButton();
}

export function removeFile(fileId) {
  const idx = queueFiles.findIndex((f) => f.id === fileId);
  if (idx === -1) return;

  const item = queueFiles[idx];
  if (item.previewUrl) {
    URL.revokeObjectURL(item.previewUrl);
  }

  queueFiles.splice(idx, 1);
  renderQueue();
  updateSubmitButton();
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid type: ${file.type || 'unknown'}. Allowed: ${ALLOWED_TYPES.join(', ')}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Too large: ${formatBytes(file.size)}. Max: ${formatBytes(MAX_FILE_SIZE)}` };
  }
  return { valid: true, error: null };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function generatePreview(queueItem) {
  const reader = new FileReader();
  reader.onload = (e) => {
    queueItem.previewUrl = e.target.result;
    renderQueue();
  };
  reader.readAsDataURL(queueItem.file);
}

function renderQueue() {
  if (!queueContainer) return;

  if (queueFiles.length === 0) {
    queueContainer.innerHTML = '<p class="queue-empty">Drop files here or click to browse</p>';
    return;
  }

  queueContainer.innerHTML = queueFiles
    .map(
      (item) => `
    <div class="queue-item ${item.status}" data-id="${item.id}">
      <div class="queue-item-preview">
        ${item.previewUrl ? `<img src="${item.previewUrl}" alt="" />` : '<div class="queue-item-placeholder">?</div>'}
      </div>
      <div class="queue-item-info">
        <div class="queue-item-name">${escapeHtml(item.file.name)}</div>
        <div class="queue-item-size">${formatBytes(item.file.size)}</div>
        ${item.error ? `<div class="queue-item-error">${escapeHtml(item.error)}</div>` : ''}
        ${item.status === 'uploading' || item.status === 'processing'
          ? `<div class="queue-item-progress"><div class="queue-item-progress-bar" style="width: ${item.progressPercent}%"></div></div>`
          : ''}
        ${item.status === 'uploaded' ? '<div class="queue-item-success">Uploaded</div>' : ''}
        ${item.status === 'failed' ? `<div class="queue-item-failed">Failed: ${escapeHtml(item.error || 'Unknown error')}</div>` : ''}
      </div>
      <button class="queue-item-remove" data-id="${item.id}" aria-label="Remove file">&times;</button>
    </div>
  `
    )
    .join('');

  // Attach remove handlers
  queueContainer.querySelectorAll('.queue-item-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(btn.dataset.id);
    });
  });
}

function updateSubmitButton() {
  if (!submitBatchBtn) return;
  const validCount = queueFiles.filter((f) => f.status === 'pending' || f.status === 'uploading' || f.status === 'processing' || f.status === 'uploaded').length;
  submitBatchBtn.disabled = validCount === 0;
  submitBatchBtn.textContent = validCount > 0 ? `Upload ${validCount} File${validCount !== 1 ? 's' : ''}` : 'Upload';
}

async function submitBatch() {
  const validFiles = queueFiles.filter((f) => f.status === 'pending');
  if (validFiles.length === 0) return;

  if (validFiles.length > 10) {
    showQueueMessage('Maximum 10 files per batch', 'error');
    return;
  }

  submitBatchBtn.disabled = true;
  submitBatchBtn.textContent = 'Uploading...';

  // Mark all as uploading
  validFiles.forEach((f) => {
    f.status = 'uploading';
    f.progressPercent = 0;
  });
  renderQueue();

  const formData = new FormData();
  validFiles.forEach((f) => formData.append('images', f.file));

  if (watermarkInput?.value.trim()) {
    formData.append('watermark', watermarkInput.value.trim());
  }

  try {
    const res = await fetch('/uploadImages', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (res.status === 401 || res.status === 403) {
      showQueueMessage('Admin access required. Please login.', 'error');
      submitBatchBtn.disabled = false;
      submitBatchBtn.textContent = 'Upload';
      return;
    }

    const data = await res.json();

    if (res.ok && data.success) {
      currentJobId = data.data.jobId;
      showBatchProgress();
      connectToProgressStream(currentJobId);
    } else {
      showQueueMessage(data.error || 'Upload failed', 'error');
      validFiles.forEach((f) => {
        f.status = 'failed';
        f.error = data.error || 'Upload failed';
      });
      renderQueue();
      submitBatchBtn.disabled = false;
      submitBatchBtn.textContent = 'Upload';
    }
  } catch (err) {
    showQueueMessage('Network error. Is the server running?', 'error');
    validFiles.forEach((f) => {
      f.status = 'failed';
      f.error = 'Network error';
    });
    renderQueue();
    submitBatchBtn.disabled = false;
    submitBatchBtn.textContent = 'Upload';
  }
}

function showBatchProgress() {
  if (!batchProgressContainer) return;
  batchProgressContainer.classList.add('visible');
}

function hideBatchProgress() {
  if (!batchProgressContainer) return;
  batchProgressContainer.classList.remove('visible');
}

function connectToProgressStream(jobId) {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`/uploads/progress/${jobId}`);

  eventSource.addEventListener('connected', (e) => {
    const data = JSON.parse(e.data);
    updateOverallProgress(data);
  });

  eventSource.addEventListener('processing', (e) => {
    const data = JSON.parse(e.data);
    updateFileProgress(data);
  });

  eventSource.addEventListener('uploaded', (e) => {
    const data = JSON.parse(e.data);
    updateFileProgress(data);
  });

  eventSource.addEventListener('failed', (e) => {
    const data = JSON.parse(e.data);
    updateFileProgress(data);
  });

  eventSource.addEventListener('completed', (e) => {
    const data = JSON.parse(e.data);
    updateOverallProgress(data);
    showQueueMessage(`Upload complete! ${data.completedFiles} succeeded, ${data.failedFiles} failed.`, data.failedFiles > 0 ? 'warning' : 'success');
    eventSource.close();
    eventSource = null;

    // Clear queue after completion
    setTimeout(() => {
      queueFiles.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      queueFiles = [];
      renderQueue();
      hideBatchProgress();
      submitBatchBtn.disabled = false;
      submitBatchBtn.textContent = 'Upload';

      // Refresh gallery
      if (typeof window.loadImages === 'function') {
        window.loadImages();
      }
    }, 3000);
  });

  eventSource.addEventListener('rolled_back', (e) => {
    const data = JSON.parse(e.data);
    showQueueMessage('Upload failed. All changes were rolled back.', 'error');
    updateOverallProgress(data);
    eventSource.close();
    eventSource = null;
    submitBatchBtn.disabled = false;
    submitBatchBtn.textContent = 'Upload';
  });

  eventSource.onerror = () => {
    eventSource.close();
    eventSource = null;
  };
}

function updateFileProgress(data) {
  const file = queueFiles[data.fileIndex];
  if (!file) return;

  file.status = data.status;
  file.progressPercent = data.progressPercent || 0;
  if (data.error) file.error = data.error;
  renderQueue();
}

function updateOverallProgress(data) {
  if (!overallProgressBar || !overallProgressText) return;

  const percent = data.overallPercent || 0;
  overallProgressBar.style.width = `${percent}%`;
  overallProgressText.textContent = `${percent}% (${data.completedFiles || 0}/${data.totalFiles || 0})`;
}

function showQueueMessage(msg, type = 'info') {
  const msgEl = document.getElementById('queue-message');
  if (!msgEl) return;
  msgEl.textContent = msg;
  msgEl.className = `queue-message ${type} show`;
  setTimeout(() => msgEl.classList.remove('show'), 5000);
}

async function loadAlbums() {
  if (!albumSelect) return;
  try {
    const res = await fetch('/albums');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      albumSelect.innerHTML = '<option value="">-- No Album --</option>' +
        data.data.map((album) => `<option value="${album._id}">${escapeHtml(album.name)}</option>`).join('');
    }
  } catch (_err) {
    console.warn('Failed to load albums');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
