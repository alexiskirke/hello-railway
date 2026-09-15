const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const publicDir = path.join(__dirname, "public");

const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

function send(res, status, body, headers) {
  res.writeHead(status, headers);
  res.end(body);
}

function safePublicPath(urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relative = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.resolve(publicDir, `.${relative}`);
  if (resolved !== publicDir && !resolved.startsWith(`${publicDir}${path.sep}`)) {
    return null;
  }
  return resolved;
}

function createServer(startedAt = new Date().toISOString()) {
  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/health") {
      send(
        res,
        200,
        JSON.stringify({
          ok: true,
          service: "hello-railway",
          game: "conjuring-fruit",
          startedAt,
        }),
        { "content-type": "application/json; charset=utf-8" }
      );
      return;
    }

    const filePath = safePublicPath(url.pathname);
    if (!filePath) {
      send(res, 400, "Bad path", { "content-type": "text/plain; charset=utf-8" });
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          send(res, 500, "Read error", { "content-type": "text/plain; charset=utf-8" });
          return;
        }
        send(res, 200, data, {
          "content-type": mime[ext] || "application/octet-stream",
          "cache-control": ext === ".html" || ext === ".js" || ext === ".css" ? "no-cache" : "public, max-age=86400",
        });
      });
    });
  });
}

function listen(port = Number.parseInt(process.env.PORT || "3000", 10)) {
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(port, "0.0.0.0", () => {
      console.log(`hello-railway listening on ${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  listen();
}

module.exports = { createServer, safePublicPath, listen, publicDir };
