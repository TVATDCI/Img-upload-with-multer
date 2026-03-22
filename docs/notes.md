# Development Notes

## MongoDB and Image Storage

MongoDB doesn't store actual image files, but instead stores image metadata such as the filename, path, upload date, and user IP. The actual image file is stored in the server's `/uploads` folder.

## What You Can Do with Image Data in MongoDB

### 1. Fetch and Display the Image in a Frontend App

Retrieve the metadata from MongoDB and use it to display the image in your frontend.

Example endpoint to fetch uploaded image metadata:

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

Example frontend fetch:

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

Access images via static file serving:

```js
app.use("/uploads", express.static(uploadDir));
```

Example image tag:
```html
<img src="http://localhost:3001/uploads/1737483101087-microsoft.png" alt="Uploaded Image">
```

### 2. Update or Delete Images

Delete an image — find it by ID in MongoDB, remove the file from `/uploads/`, then delete the document:

```js
app.delete("/deleteImage/:id", async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    fs.unlinkSync(image.path);

    await Image.findByIdAndDelete(req.params.id);
    res.json({ message: "Image deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete image" });
  }
});
```

### 3. GridFS (Optional)

For distributed applications where you don't want to rely on local filesystem storage, use GridFS to store image files directly in MongoDB.

### 4. Path Module (ESM)

When working with ES modules, `__dirname` is not available directly. Use `fileURLToPath`:

```js
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```
