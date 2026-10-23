# Rooted

Rooted is a digital sanctuary and community platform for Christian literature, spiritual formation and honest storytelling: a curated library, book clubs, a Story Room for essays and reflections, an AI reading companion, and a 2D book reader that feels like holding a real book.

## Tech stack

- **Frontend** — React + Vite, lucide-react (`frontend/`)
- **Backend** — Node.js, Express 5 (`backend/`)
- **Database / auth** — Supabase (PostgreSQL)
- **AI** — Claude via the Anthropic API (`ANTHROPIC_API_KEY`), with a local Ollama fallback for development

## Book reader

`frontend/src/BookReader.jsx` — tap the cover to open; tap, swipe or drag a page to turn it; contents, bookmarks, text size, three page colours (classic / paper / night), page-turn sound, and a reading position that survives resizing. Put `# Chapter title` lines in a manuscript to create chapters.

## Local development

```bash
# Backend  -> http://localhost:5000
cd backend && npm install && cp .env.example .env   # fill in the values
npm run dev

# Frontend -> http://localhost:3000
cd frontend && npm install && cp .env.example .env
npm run dev
```

## Environment variables

Real values go in `.env` files or your host's dashboard — never in the repo.

| Variable | Where | Description |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | backend | Supabase project access |
| `ANTHROPIC_API_KEY`, `AI_MODEL` | backend | Hosted AI (leave key empty to use Ollama) |
| `OLLAMA_URL`, `OLLAMA_MODEL` | backend | Local AI fallback |
| `CORS_ORIGIN` | backend | Comma-separated allowed origins (empty = all) |
| `ENABLE_WRITES` | backend | `true` to allow creation endpoints (default `false`) |
| `VITE_API_URL` | frontend | Backend URL in local dev |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | frontend | Public Supabase client settings |

## Database setup (run once)

In Supabase open **SQL Editor -> New query**, paste the contents of `supabase/001_writers_and_persistence.sql` and run it. It adds writer profiles, drafts/published stories, saved books, club membership, likes, notes and subscriptions, and locks tables so the public anon key can only read public content. Writes go through the backend, so `SUPABASE_SERVICE_ROLE_KEY` must be set on the server.

Or from your own computer: put your database URI in `backend/.env` as `SUPABASE_DB_URL` and run `cd backend && npm run migrate`. (Do not use `migrate_schema.js`: it drops the books, clubs and stories tables.)

## Writers

The **Writers** tab lets any signed-in reader join the writers, write stories, save drafts, publish, edit and delete their own stories, and see their stats. Content creation is on by default; set `ENABLE_WRITES=false` to pause it.

## Books, chapters and covers

Writers create books under **Writers -> My books**: add details and a cover (uploaded to Supabase Storage), write chapters, reorder them, then publish. Readers only see published books, and the reader shows the chapters as real pages. Run `supabase/003_chapters_and_covers.sql` once to enable this.

## Deploying to Render

`render.yaml` defines a single web service that builds the frontend and serves it from the API. Create a Blueprint from the repo, then fill in the secret variables in the Render dashboard.
