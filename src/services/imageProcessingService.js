import path from 'path';
import sharp from 'sharp';

export const VARIANT_SPECS = [
  {
    size: 'thumb',
    width: 150,
    height: 150,
    fit: 'cover',
    position: 'center',
    quality: 80,
    watermarkable: false,
  },
  {
    size: 'preview',
    width: 800,
    height: 600,
    fit: 'inside',
    quality: 85,
    watermarkable: true,
  },
  {
    size: 'full',
    width: 1920,
    height: 1080,
    fit: 'inside',
    quality: 90,
    watermarkable: true,
  },
];

export const VALID_VARIANT_SIZES = VARIANT_SPECS.map((variant) => variant.size);

const WATERMARK_ERROR = 'Invalid watermark: must be 1-50 printable characters';
const PRINTABLE_ASCII_REGEX = /^[\x20-\x7E]{1,50}$/;

const escapeXml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const createWatermarkSvg = (watermark, width, height) => `
  <svg width="${width}" height="${height}">
    <style>
      .watermark {
        fill: rgba(255, 255, 255, 0.5);
        font-size: 24px;
        font-family: Arial, sans-serif;
      }
    </style>
    <text x="${Math.max(width - 10, 10)}" y="${Math.max(height - 10, 24)}" text-anchor="end" class="watermark">${escapeXml(
      watermark
    )}</text>
  </svg>
`;

const buildBaseVariantBuffer = async ({ inputPath, spec, watermark }) => {
  let pipeline = sharp(inputPath).rotate().resize({
    width: spec.width,
    height: spec.height,
    fit: spec.fit,
    position: spec.position,
    withoutEnlargement: true,
  });

  if (!watermark || !spec.watermarkable) {
    return pipeline.toBuffer();
  }

  const resizedBuffer = await pipeline.toBuffer();
  const metadata = await sharp(resizedBuffer).metadata();

  return sharp(resizedBuffer)
    .composite([
      {
        input: Buffer.from(createWatermarkSvg(watermark, metadata.width || spec.width, metadata.height || spec.height)),
        gravity: 'southeast',
      },
    ])
    .toBuffer();
};

export const validateWatermark = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  if (!PRINTABLE_ASCII_REGEX.test(normalized)) {
    throw new Error(WATERMARK_ERROR);
  }

  return normalized;
};

export const generateImageVariants = async ({ inputPath, originalFilename, watermark = null }) => {
  const sourceName = path.parse(originalFilename).name;

  return Promise.all(
    VARIANT_SPECS.map(async (spec) => {
      const baseBuffer = await buildBaseVariantBuffer({ inputPath, spec, watermark });
      const metadata = await sharp(baseBuffer).metadata();
      const buffer = await sharp(baseBuffer).webp({ quality: spec.quality }).toBuffer();
      const fallbackBuffer = await sharp(baseBuffer).jpeg({ quality: spec.quality }).toBuffer();

      return {
        size: spec.size,
        filenameBase: `${sourceName}-${spec.size}`,
        width: metadata.width,
        height: metadata.height,
        format: 'image/webp',
        fallbackFormat: 'image/jpeg',
        buffer,
        fallbackBuffer,
      };
    })
  );
};
