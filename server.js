import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 8080;

const MIMES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  let p = path.join(DIST, urlPath === "/" ? "index.html" : path.normalize(urlPath).replace(/^\//, ""));
  if (!p.startsWith(DIST)) p = path.join(DIST, "index.html");
  const ext = path.extname(p);
  const mime = MIMES[ext] || "application/octet-stream";

  fs.readFile(p, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        fs.readFile(path.join(DIST, "index.html"), (e, html) => {
          if (e) {
            res.writeHead(500);
            res.end("Error");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(html);
        });
        return;
      }
      res.writeHead(500);
      res.end("Error");
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
