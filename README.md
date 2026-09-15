# Hello Railway

A small Node.js service set up to deploy on Railway from GitHub.

- Homepage: `/`
- Health check: `/health`

## Local

```bash
npm start
```

The app listens on `PORT` (default `3000`).

## Railway

Railway reads `railway.json` and starts the app with `npm start`. After the GitHub repo is connected, pushes to `main` deploy automatically.
