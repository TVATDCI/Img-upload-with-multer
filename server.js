import app from "./src/app.js";
import { env } from "./src/config/index.js";

const port = env.port;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
