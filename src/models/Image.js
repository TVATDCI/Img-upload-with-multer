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
  },
  { timestamps: true }
);

const Image = mongoose.model('Image', imageSchema);
export default Image;
