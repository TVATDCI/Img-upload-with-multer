import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll, describe, expect, test } from '@jest/globals';
import Album from '../../../src/models/Album.js';
import Image from '../../../src/models/Image.js';

let mongoServer;

describe('Album model', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'jest-album-model' });
  });

  afterEach(async () => {
    await Promise.all([Album.deleteMany({}), Image.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('trims name and description, defaults coverImage to null, and sets createdAt', async () => {
    const album = await Album.create({
      name: '  Summer Trip  ',
      description: '  Beach photos  ',
    });

    expect(album.name).toBe('Summer Trip');
    expect(album.description).toBe('Beach photos');
    expect(album.coverImage).toBeNull();
    expect(album.createdAt).toBeInstanceOf(Date);
  });

  test('rejects invalid field lengths', async () => {
    await expect(
      Album.create({
        name: 'x'.repeat(101),
        description: 'y'.repeat(501),
      })
    ).rejects.toThrow();
  });

  test('enforces globally unique album names', async () => {
    await Album.create({ name: 'Portfolio' });

    await expect(Album.create({ name: 'Portfolio' })).rejects.toMatchObject({ code: 11000 });
  });
});
