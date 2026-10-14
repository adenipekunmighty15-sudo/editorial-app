# Rooted

Rooted is a digital sanctuary and community platform dedicated to Christian literature, spiritual formation, and honest storytelling. Designed to help users "read deeply and live fully," it serves as an ecosystem where faith and literature intersect — a curated library, intimate book clubs, a Story Room for essays and reflections, and a cinematic 3D book preview built with Three.js and GSAP.

## Tech stack

- **Frontend** — React + Vite, Three.js, GSAP, lucide-react (`frontend/`)
- **Backend** — Node.js, Express 5, Mongoose 9 (`backend/`)
- **Database** — MongoDB (MongoDB Atlas)

## Project structure

```
backend/            Express API
  config/db.js      MongoDB connection
  controllers/      Request handlers
  models/           Mongoose schemas (Book, Club, Story)
  routes/           /api routes
frontend/           Vite + React single-page app
  public/book.glb   Blender-exported 3D notebook
  src/Book3D.jsx    Three.js book viewer
tools/make_book.py  Blender script that generates book.glb
render.yaml         Render deploy blueprint
```

## Local development

Two processes: the API and the Vite dev server.

**1. Backend**

```bash
cd backend
npm install
cp .env.example .env   # then edit MONGO_URI
npm run dev            # http://localhost:5000
```

**2. Frontend**

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000
npm run dev            # http://localhost:3000
```

During development the frontend calls the API at `VITE_API_URL` (CORS allowlist via `CORS_ORIGIN`).

## Environment variables

Backend (`backend/.env`):

| Variable | Description |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (required) |
| `PORT` | API port (default `5000`; hosts set this) |
| `CORS_ORIGIN` | Comma-separated allowed origins (empty = all) |
| `ENABLE_WRITES` | `true` to allow `POST` creation endpoints (default `false`) |
| `NODE_ENV` | `production` when deployed |

Frontend (`frontend/.env`):

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL. Leave empty in production (same-origin). |

## Production (single service)

The Express server serves both the API and the built frontend, so there is one
service and no CORS. Build the frontend first, then start the server:

```bash
npm --prefix frontend install && npm --prefix frontend run build
npm --prefix backend install
node backend/index.js
```

The server serves `frontend/dist` and falls back to `index.html` for client-side
routes. API routes live under `/api`; a `GET /api/health` endpoint reports
service and database status.

## Deploy to Render

1. Push the repo to GitHub.
2. In Render, create a **Blueprint** from this repo (`render.yaml`) or a Web
   Service with:
   - **Build command:** `npm --prefix backend install && npm --prefix frontend install && npm --prefix frontend run build`
   - **Start command:** `node backend/index.js`
   - **Health check path:** `/api/health`
3. Set `MONGO_URI` to your MongoDB Atlas connection string (mark as secret).
4. In **MongoDB Atlas → Network Access**, allow Render's outbound IPs (or
   `0.0.0.0/0` to start) so the API can connect.
5. Deploy. Render runs the app on `$PORT` and auto-assigns HTTPS. Add a custom
   domain in Render if you have one.

`ENABLE_WRITES` defaults to `false`, so the site launches **read-only** — safe
from public spam. Set it to `true` (plus `CORS_ORIGIN`) when you add auth and
want to accept content again.

## API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | Service + DB status |
| `GET` | `/api/books` | List books |
| `GET` | `/api/clubs` | List clubs |
| `GET` | `/api/stories` | List stories |
| `POST` | `/api/books` \| `/api/clubs` \| `/api/stories` | Disabled unless `ENABLE_WRITES=true` |

## Regenerating the 3D notebook

Requires Blender:

```bash
blender --background --python tools/make_book.py -- frontend/public/book.glb
```
