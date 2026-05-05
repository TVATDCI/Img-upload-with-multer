import * as imageService from './imageService.js';
import * as uploadProgressService from './uploadProgressService.js';
import { deleteFile } from '../utils/fileUtils.js';

const MAX_BATCH_SIZE = 10;

export const createBatchUpload = async (files, user_ip, watermark = null) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('No files provided');
  }

  if (files.length > MAX_BATCH_SIZE) {
    throw new Error(`Maximum batch size is ${MAX_BATCH_SIZE} files`);
  }

  const jobId = uploadProgressService.createJob(files.length);
  const createdImages = [];
  let hasFailures = false;

  uploadProgressService.setJobStatus(jobId, 'processing');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    uploadProgressService.updateFileProgress(jobId, i, {
      filename: file.originalname,
      status: 'processing',
      progressPercent: 10,
      message: 'Processing upload',
    });

    try {
      uploadProgressService.updateFileProgress(jobId, i, {
        progressPercent: 40,
        message: 'Uploading to storage',
      });

      const image = await imageService.createImage({
        filename: file.filename,
        originalName: file.originalname,
        localFilePath: file.path,
        size: file.size,
        user_ip,
        watermark,
      });

      createdImages.push(image);

      uploadProgressService.updateFileProgress(jobId, i, {
        status: 'uploaded',
        progressPercent: 100,
        message: 'Upload complete',
        imageId: image._id.toString(),
      });
    } catch (err) {
      hasFailures = true;

      uploadProgressService.updateFileProgress(jobId, i, {
        status: 'failed',
        progressPercent: 0,
        message: 'Upload failed',
        error: err.message,
      });
    }
  }

  if (hasFailures && createdImages.length > 0) {
    // Rollback: delete successfully created images
    uploadProgressService.setJobStatus(jobId, 'rolled_back');

    for (const image of createdImages) {
      try {
        await imageService.deleteImage(image._id);
      } catch {
        // Best-effort rollback cleanup
      }
    }

    // Clean up any remaining uploaded files
    for (const file of files) {
      deleteFile(file.path);
    }

    return { jobId, status: 'rolled_back', createdCount: 0, failedCount: files.length };
  }

  if (hasFailures) {
    uploadProgressService.setJobStatus(jobId, 'failed');
    return { jobId, status: 'failed', createdCount: 0, failedCount: files.length };
  }

  uploadProgressService.setJobStatus(jobId, 'completed');
  return {
    jobId,
    status: 'completed',
    createdCount: createdImages.length,
    failedCount: 0,
    images: createdImages,
  };
};
