import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  user_ip: { type: String, required: true },
});

const Image = mongoose.model("Image", imageSchema);
export default Image;
