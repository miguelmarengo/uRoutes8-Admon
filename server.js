import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 8080;

let appVersionHeader = "unknown";
try {
  appVersionHeader = fs.readFileSync(path.join(__dirname, "VERSION"), "utf8").trim();
} catch {
  /* sin VERSION en la imagen (p. ej. build local sin copiar) */
}

/** Cabecera para comprobar en DevTools → Red → documento → Encabezados (sin caché de JS). */
function withVersionHeaders(headers) {
  return {
    ...headers,
    "X-App-Version": appVersionHeader,
  };
}

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

/** Evita que el navegador reutilice un index.html viejo que apunte a chunks antiguos. */
function headersForFile(absPath, ext) {
  const mime = MIMES[ext] || "application/octet-stream";
  const rel = path.relative(DIST, absPath);
  const isHtml = ext === ".html";
  const underAssets =
    rel.startsWith(`assets${path.sep}`) || rel.startsWith("assets/");

  if (isHtml) {
    return {
      "Content-Type": mime,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    };
  }
  // no-store: Chrome deja de guardar el .js en disco (principal causa de "misma URL, bundle viejo").
  if (underAssets && (ext === ".js" || ext === ".css")) {
    return {
      "Content-Type": mime,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    };
  }
  return {
    "Content-Type": mime,
    "Cache-Control": "public, max-age=3600",
  };
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  let p = path.join(DIST, urlPath === "/" ? "index.html" : path.normalize(urlPath).replace(/^\//, ""));
  if (!p.startsWith(DIST)) p = path.join(DIST, "index.html");
  const ext = path.extname(p);

  fs.readFile(p, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        fs.readFile(path.join(DIST, "index.html"), (e, html) => {
          if (e) {
            res.writeHead(500);
            res.end("Error");
            return;
          }
          res.writeHead(
            200,
            withVersionHeaders(headersForFile(path.join(DIST, "index.html"), ".html")),
          );
          res.end(html);
        });
        return;
      }
      res.writeHead(500);
      res.end("Error");
      return;
    }
    res.writeHead(200, withVersionHeaders(headersForFile(p, ext)));
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
