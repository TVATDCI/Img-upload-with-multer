import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { imageSize } from 'image-size';
import { getPalette } from 'colorthief';
import Image from '../src/models/Image.js';
import { env } from '../src/config/index.js';
import { connectDB } from '../src/config/database.js';

const UPLOADS_DIR = env.uploadsFolder || './uploads';

async function extractImageMetadata(filePath) {
  const metadata = {
    dimensions: {},
    colors: [],
    fileType: null,
    size: 0,
  };

  try {
    const stats = fs.statSync(filePath);
    metadata.size = stats.size;

    const buffer = fs.readFileSync(filePath);
    const dimensions = imageSize(buffer);
    if (dimensions) {
      metadata.dimensions = {
        width: dimensions.width,
        height: dimensions.height,
      };
      metadata.fileType = dimensions.type ? `image/${dimensions.type}` : null;
    }
  } catch (err) {
    console.warn(`Failed to extract dimensions for ${filePath}:`, err.message);
  }

  try {
    const palette = await getPalette(filePath, { colorCount: 6, format: 'hex' });
    metadata.colors = palette.map((c) => c.hex);
  } catch (err) {
    console.warn(`Failed to extract colors for ${filePath}:`, err.message);
  }

  return metadata;
}

function generateDisplayName(filename) {
  const nameWithoutExt = filename.replace(path.extname(filename), '');
  return nameWithoutExt.replace(/-/g, ' ');
}

async function syncLocalImagesToDatabase() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const uploadDir = path.resolve(UPLOADS_DIR);
    
    if (!fs.existsSync(uploadDir)) {
      console.log('Uploads directory does not exist:', uploadDir);
      process.exit(0);
    }

    const files = fs.readdirSync(uploadDir).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    console.log(`Found ${files.length} image(s) in uploads folder`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const filename of files) {
      try {
        const filePath = path.join(uploadDir, filename);
        const existingImage = await Image.findOne({ filename });

        if (existingImage) {
          console.log(`Skipping ${filename} - already in database`);
          skipped++;
          continue;
        }

        console.log(`Processing ${filename}...`);
        const metadata = await extractImageMetadata(filePath);

        const image = new Image({
          filename,
          originalName: filename,
          displayName: generateDisplayName(filename),
          path: `/uploads/${filename}`,
          publicId: null,
          localPath: filePath,
          size: metadata.size,
          dimensions: metadata.dimensions,
          colors: metadata.colors,
          fileType: metadata.fileType,
          uploadDate: new Date(),
          user_ip: '127.0.0.1',
          album: null,
          variants: [],
          watermarked: false,
        });

        await image.save();
        console.log(`Created Image record: ${image._id}`);
        created++;
      } catch (err) {
        console.error(`Failed to process ${filename}:`, err.message);
        failed++;
      }
    }

    console.log('\n=== Sync Complete ===');
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total images in DB: ${await Image.countDocuments()}`);

    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err.message);
    process.exit(1);
  }
}

syncLocalImagesToDatabase();
