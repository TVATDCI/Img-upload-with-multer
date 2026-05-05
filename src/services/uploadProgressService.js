import crypto from 'crypto';

const JOB_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

const jobs = new Map();
const clients = new Map(); // jobId -> Set of response objects

const cleanupExpiredJobs = () => {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (job.completedAt && now - job.completedAt > JOB_TTL_MS) {
      jobs.delete(jobId);
      clients.delete(jobId);
    }
  }
};

setInterval(cleanupExpiredJobs, CLEANUP_INTERVAL_MS);

export const createJob = (totalFiles) => {
  const jobId = crypto.randomUUID();
  const job = {
    jobId,
    totalFiles,
    completedFiles: 0,
    failedFiles: 0,
    files: [],
    status: 'queued',
    createdAt: Date.now(),
    completedAt: null,
  };

  for (let i = 0; i < totalFiles; i++) {
    job.files.push({
      fileIndex: i,
      filename: null,
      status: 'queued',
      progressPercent: 0,
      message: 'Waiting in queue',
      imageId: null,
      error: null,
    });
  }

  jobs.set(jobId, job);
  clients.set(jobId, new Set());
  return jobId;
};

export const getJob = (jobId) => jobs.get(jobId);

export const updateFileProgress = (jobId, fileIndex, updates) => {
  const job = jobs.get(jobId);
  if (!job) return null;

  const file = job.files[fileIndex];
  if (!file) return null;

  Object.assign(file, updates);

  // Recalculate aggregate stats
  job.completedFiles = job.files.filter((f) => f.status === 'uploaded').length;
  job.failedFiles = job.files.filter((f) => f.status === 'failed').length;

  const overallPercent = job.totalFiles > 0
    ? Math.round(
        (job.files.reduce((sum, f) => sum + (f.progressPercent || 0), 0) / (job.totalFiles * 100)) * 100
      )
    : 0;

  const eventData = {
    jobId,
    fileIndex,
    ...updates,
    overallPercent,
    completedFiles: job.completedFiles,
    failedFiles: job.failedFiles,
    totalFiles: job.totalFiles,
  };

  broadcastEvent(jobId, updates.status || 'processing', eventData);
  return job;
};

export const setJobStatus = (jobId, status) => {
  const job = jobs.get(jobId);
  if (!job) return null;

  job.status = status;

  if (status === 'completed' || status === 'rolled_back') {
    job.completedAt = Date.now();
  }

  const overallPercent = job.totalFiles > 0
    ? Math.round(
        (job.files.reduce((sum, f) => sum + (f.progressPercent || 0), 0) / (job.totalFiles * 100)) * 100
      )
    : 0;

  broadcastEvent(jobId, status, {
    jobId,
    status,
    totalFiles: job.totalFiles,
    completedFiles: job.completedFiles,
    failedFiles: job.failedFiles,
    overallPercent,
    files: job.files,
  });

  return job;
};

export const addClient = (jobId, res) => {
  const jobClients = clients.get(jobId);
  if (!jobClients) return false;

  jobClients.add(res);

  // Send current aggregate state immediately
  const job = jobs.get(jobId);
  if (job) {
    sendEvent(res, 'connected', {
      jobId,
      status: job.status,
      totalFiles: job.totalFiles,
      completedFiles: job.completedFiles,
      failedFiles: job.failedFiles,
      overallPercent: calculateOverallPercent(job),
    });
  }

  return true;
};

export const removeClient = (jobId, res) => {
  const jobClients = clients.get(jobId);
  if (!jobClients) return;
  jobClients.delete(res);
};

const calculateOverallPercent = (job) => {
  if (!job || job.totalFiles === 0) return 0;
  const totalProgress = job.files.reduce((sum, f) => sum + (f.progressPercent || 0), 0);
  return Math.round((totalProgress / (job.totalFiles * 100)) * 100);
};

const sendEvent = (res, event, data) => {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const broadcastEvent = (jobId, event, data) => {
  const jobClients = clients.get(jobId);
  if (!jobClients) return;

  for (const res of jobClients) {
    if (res.writableEnded || res.destroyed) {
      jobClients.delete(res);
      continue;
    }
    sendEvent(res, event, data);
  }
};

// Heartbeat broadcaster
setInterval(() => {
  for (const [jobId, job] of jobs.entries()) {
    if (job.status !== 'completed' && job.status !== 'rolled_back') {
      broadcastEvent(jobId, 'heartbeat', { jobId, timestamp: Date.now() });
    }
  }
}, 15000);
