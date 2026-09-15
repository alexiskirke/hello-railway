const http = require("node:http");

const port = Number.parseInt(process.env.PORT || "3000", 10);
const startedAt = new Date().toISOString();

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hello Railway</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        display: grid;
        place-items: center;
        background: #0b0f14;
        color: #e8eef5;
      }
      main {
        width: min(40rem, calc(100vw - 2rem));
        padding: 2rem;
        border: 1px solid #243041;
        border-radius: 1rem;
        background: #121821;
      }
      h1 { margin: 0 0 0.5rem; font-size: 1.75rem; }
      p { margin: 0.4rem 0; color: #b7c3d1; line-height: 1.5; }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        background: #0b0f14;
        padding: 0.1rem 0.35rem;
        border-radius: 0.35rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Hello Railway</h1>
      <p>This service is live and ready to deploy from GitHub.</p>
      <p>Health check: <code>/health</code></p>
      <p>Started at <code>${startedAt}</code></p>
    </main>
  </body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "hello-railway",
        startedAt,
      })
    );
    return;
  }

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`hello-railway listening on ${port}`);
});
