import express from "express";
import cors from "cors";
import { env } from "./config/index.js";
import { connectDB } from "./config/database.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: env.cors.origin }));
app.use(express.json());

const uploadDir = path.resolve(__dirname, "..", env.uploadsFolder);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

app.use(routes);

app.use(errorHandler);

await connectDB();

export default app;
