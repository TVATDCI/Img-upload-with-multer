import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";
import connectToDB from "./libs/db.js";
// import path from "path";
// The path module provides utilities to work with file and directory paths across different operating systems (Windows, Linux, macOS).
// It's commonly used for tasks like:

// Joining paths dynamically (path.join)
// Resolving absolute paths (path.resolve)
// Handling file extensions (path.extname)
{
  /**
  import path from "path";
const uploadPath = path.join(__dirname, "uploads");
console.log(uploadPath); (Outputs full path like "/home/user/project/uploads")

   */
}
// import { fileURLToPath } from "url";
// fileURLToPath (from the url module)
// This function is useful when working with ES modules (import/export).
// Unlike CommonJS (require), ES modules don't provide __dirname or __filename directly.
// fileURLToPath(import.meta.url) helps convert the module's URL to a usable file path.
{
  /**
  import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);

   */
}

dotenv.config();
await connectToDB();

const app = express();
app.use(cors());

// Ensure the `uploads` directory exists
import fs from "fs";
const uploadDir = process.env.UPLOADS_FOLDER;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOADS_FOLDER);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 }, // 200KB limit
});

// Serve uploaded images statically
app.use("/uploads", express.static(uploadDir));

// Import the Image model
import Image from "./models/imageModel.js";

// Handle file upload endpoint
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
  console.log(`The server 🙈 is listening on port ${port}`);
});

{
  /**
   *### self note for further development

MongoDB doesn't store actual image files, but instead, it stores image metadata, such as the filename, path, upload date, and user IP, as you've seen in your document.

What You Can Do with Image Data in MongoDB
Since the actual image file is stored in your server's /uploads folder (as indicated in the path field), the image metadata in MongoDB allows you to:

1. Fetch and Display the Image in a Frontend App
   You can retrieve the metadata (e.g., the path field) from MongoDB and use it to display the image in your frontend.

Example Steps to Fetch and Display Images:
Create an endpoint to fetch uploaded image metadata:
Add this to your Express server:

```js
app.get("/getImages", async (req, res) => {
  try {
    const images = await Image.find();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});
```

Fetch the image data in your frontend: Example using fetch in JavaScript:

```js
async function fetchImages() {
  const response = await fetch("http://localhost:3001/getImages");
  const images = await response.json();

  images.forEach((image) => {
    const imgElement = document.createElement("img");
    imgElement.src = `http://localhost:3001/${image.path}`;
    imgElement.alt = image.filename;
    document.body.appendChild(imgElement);
  });
}

fetchImages();
```

Access the images via the server: Since your server is serving the /uploads folder statically:

```js
app.use("/uploads", express.static(uploadDir));
```

If your image path is "uploads/1737483101087-microsoft.png", you can display it using:

```markdown
<img src="http://localhost:3001/uploads/1737483101087-microsoft.png" alt="Uploaded Image">
```

Use the Image Path in Other Parts of Your App

You can save the image URL in user profiles or product listings.
Serve the image URLs to be shared in social media previews.
Use the stored data for analytics, tracking upload times, or IP-based usage reports.
Update or Delete Images

Since the path is stored in MongoDB, you can:

Delete an image: When a user requests to delete an image, find it by filename in MongoDB, remove the file from /uploads/ using fs.unlinkSync, and then delete the document from MongoDB.

```js
app.delete("/deleteImage/:id", async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Delete the file from uploads folder
    fs.unlinkSync(image.path);

    // Remove from MongoDB
    await Image.findByIdAndDelete(req.params.id);
    res.json({ message: "Image deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete image" });
  }
});
```

Use GridFS for Storing Images in MongoDB (Optional)
If you want to store actual image files in MongoDB, you can use GridFS, which allows you to store large binary data directly in the database.
With GridFS, you can query, retrieve, and serve image files directly from MongoDB instead of saving them to the filesystem.
This is useful for distributed applications where you don't want to rely on a local storage solution.

   */
}
