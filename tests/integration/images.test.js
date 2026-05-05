import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import Image from '../../src/models/Image.js';
import * as cloudinaryService from '../../src/services/cloudinaryService.js';
import {
  cleanupDb,
  createAuthCookie,
  getUploadsDir,
  samplePngPath,
  seedAdminUser,
  seedImage,
} from '../utils/testHelpers.js';
import { setupIntegrationApp, teardownIntegrationApp } from '../utils/testApp.js';

const createVariantFile = async (targetName) => {
  const uploadsDir = getUploadsDir();
  const variantPath = path.join(uploadsDir, 'variants', targetName);
  await fs.mkdir(path.dirname(variantPath), { recursive: true });

  await sharp({
    create: {
      width: 150,
      height: 150,
      channels: 3,
      background: { r: 120, g: 90, b: 60 },
    },
  })
    .webp()
    .toFile(variantPath);

  return variantPath;
};

describe('image routes', () => {
  let app;

  beforeAll(async () => {
    app = await setupIntegrationApp();
  });

  beforeEach(async () => {
    await cleanupDb();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await teardownIntegrationApp();
  });

  test('GET /images returns paginated images with the standard envelope and hides variants by default', async () => {
    await seedImage({
      filename: 'first.png',
      originalName: 'first.png',
      variants: [{ size: 'thumb', path: '/uploads/thumb.webp', format: 'image/webp' }],
    });
    await seedImage({ filename: 'second.jpg', originalName: 'second.jpg', fixtureName: 'sample.jpg' });

    const response = await request(app).get('/images?page=1&limit=12');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.data).toHaveLength(2);
    expect(response.body.data.data[0].variants).toBeUndefined();
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 12,
      total: 2,
      totalPages: 1,
      hasMore: false,
    });
  });

  test('GET /images supports includeVariants=true', async () => {
    await seedImage({
      filename: 'with-variants.png',
      originalName: 'with-variants.png',
      variants: [
        {
          size: 'thumb',
          width: 150,
          height: 150,
          format: 'image/webp',
          path: '/uploads/thumb.webp',
        },
      ],
      watermarked: true,
    });

    const response = await request(app).get('/images?includeVariants=true');

    expect(response.status).toBe(200);
    expect(response.body.data.data[0].variants).toEqual([
      expect.objectContaining({
        size: 'thumb',
        width: 150,
        height: 150,
        format: 'image/webp',
      }),
    ]);
  });

  test('GET /images/:id returns a single image record with variants metadata', async () => {
    const image = await seedImage({
      filename: 'detail.png',
      originalName: 'detail.png',
      variants: [
        {
          size: 'preview',
          width: 800,
          height: 600,
          format: 'image/webp',
          path: '/uploads/preview.webp',
        },
      ],
      watermarked: true,
    });

    const response = await request(app).get(`/images/${image._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        _id: image._id.toString(),
        filename: 'detail.png',
        originalName: 'detail.png',
        watermarked: true,
        variants: [
          expect.objectContaining({
            size: 'preview',
            width: 800,
            height: 600,
            format: 'image/webp',
          }),
        ],
      },
    });
    expect(response.body.error).toBeUndefined();
  });

  test('GET /images/:id returns 404 for a missing image', async () => {
    const response = await request(app).get('/images/6818ee7dbd07a5e7b9d60aaa');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: 'Image not found!' });
  });

  test('GET /images/:id/src serves a local fixture file', async () => {
    const image = await seedImage({ filename: 'local.png', originalName: 'local.png' });

    const response = await request(app).get(`/images/${image._id}/src`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/png');
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('GET /images/:id/src proxies a cloudinary image without real credentials', async () => {
    const image = await seedImage({
      filename: 'cloudinary.jpg',
      originalName: 'cloudinary.jpg',
      fixtureName: 'sample.jpg',
      path: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      publicId: 'img-upload/cloudinary',
      localPath: null,
      fileType: 'image/jpeg',
    });

    const payload = Buffer.from('proxy-image');
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      arrayBuffer: async () => payload,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
    });

    const response = await request(app).get(`/images/${image._id}/src`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/jpeg');
    expect(Buffer.compare(response.body, payload)).toBe(0);
    expect(fetchSpy).toHaveBeenCalledWith(image.path);
  });

  test('GET /images/:id/variant/:size serves a stored local variant', async () => {
    const localVariantPath = await createVariantFile('variant-thumb.webp');
    const image = await seedImage({
      filename: 'variant-source.png',
      originalName: 'variant-source.png',
      variants: [
        {
          size: 'thumb',
          width: 150,
          height: 150,
          format: 'image/webp',
          path: '/uploads/variants/variant-thumb.webp',
          localPath: localVariantPath,
        },
      ],
    });

    const response = await request(app).get(`/images/${image._id}/variant/thumb`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/webp');
    expect(response.body.length).toBeGreaterThan(0);
  });

  test('GET /images/:id/variant/:size returns 404 for an unknown size', async () => {
    const image = await seedImage({ filename: 'unknown-size.png', originalName: 'unknown-size.png' });

    const response = await request(app).get(`/images/${image._id}/variant/tiny`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: 'Variant not found!' });
  });

  test('POST /uploadImage accepts a valid watermark and persists generated variants', async () => {
    const admin = await seedAdminUser();
    const authCookie = createAuthCookie(admin);

    jest.spyOn(cloudinaryService, 'uploadToCloudinary').mockRejectedValue(new Error('cloud offline'));

    const response = await request(app)
      .post('/uploadImage')
      .set('Cookie', authCookie)
      .field('watermark', 'Demo Mark')
      .attach('image', samplePngPath);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    const savedImage = await Image.findById(response.body.data._id).lean();
    expect(savedImage).toBeTruthy();
    expect(savedImage.watermarked).toBe(true);
    expect(savedImage.variants).toHaveLength(3);
    expect(savedImage.variants.map((variant) => variant.size)).toEqual(['thumb', 'preview', 'full']);
  });

  test('POST /uploadImage rejects invalid watermark input without creating database state', async () => {
    const admin = await seedAdminUser();
    const authCookie = createAuthCookie(admin);

    const response = await request(app)
      .post('/uploadImage')
      .set('Cookie', authCookie)
      .field('watermark', 'x'.repeat(51))
      .attach('image', samplePngPath);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Invalid watermark: must be 1-50 printable characters',
    });
    expect(await Image.countDocuments()).toBe(0);
  });
});
