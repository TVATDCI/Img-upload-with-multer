import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String },
    displayName: { type: String },
    path: { type: String, required: true },
    publicId: { type: String },
    localPath: { type: String },
    size: { type: Number },
    dimensions: {
      width: { type: Number },
      height: { type: Number },
    },
    tags: [{ type: String }],
    colors: [{ type: String }],
    fileType: { type: String },
    uploadDate: { type: Date, default: Date.now },
    user_ip: { type: String, required: true },
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Album',
      default: null,
    },
    variants: [
      {
        size: { type: String, required: true },
        width: { type: Number },
        height: { type: Number },
        format: { type: String },
        path: { type: String },
        publicId: { type: String },
        localPath: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    watermarked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Image = mongoose.model('Image', imageSchema);
export default Image;
