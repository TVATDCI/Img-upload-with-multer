import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

import connectToDB from "./libs/db.js";
import Image from "./models/imagesModel.js";

dotenv.config();

await connectToDB();

const app = express();
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, process.env.UPLOADS_FOLDER || "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 },
});

app.use("/uploads", express.static(uploadDir));

app.post("/uploadImage", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded!" });
  }

  const newImage = new Image({
    filename: req.file.filename,
    path: req.file.path,
    uploadDate: Date.now(),
    user_ip: req.ip,
  });

  await newImage.save();
  res.json({ message: "Image uploaded successfully!", data: newImage });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`The server is listening on port ${port}`);
});
