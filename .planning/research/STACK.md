# Technology Stack

**Project:** PerioPulse -- Dental Hygiene & Treatment Tracking
**Researched:** 2026-03-24

## Recommended Stack

The stack is prescribed (React + Python serverless on Vercel + Neon Postgres). Research focuses on specific library choices within these constraints.

### Core Frontend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.x | UI framework | Prescribed. React 19 is stable, supports concurrent features and Suspense for data fetching |
| Vite | 8.x | Build tool and dev server | Prescribed. v8 ships Rolldown (Rust bundler) for 10-30x faster builds. Use `@vitejs/plugin-react` v6 (Oxc-based, no Babel dependency) |
| TypeScript | 5.7+ | Type safety | Non-negotiable for a medical charting app. Catches data-shape bugs at compile time that would cause runtime charting errors |
| Tailwind CSS | 4.x | Styling | v4 has first-party Vite plugin, zero-config setup, cascade layers. Perfect for the clinical palette (custom colors via CSS custom properties). Massively faster than v3 |
| React Router | 7.x | Client-side routing | v7 is the current stable line (7.13.x). Use declarative SPA mode -- no loaders/actions needed since our data comes from FastAPI |

### Core Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.12 | Runtime | Vercel default, stable, fully supported. Do NOT use 3.14 (too new for some deps). 3.12 is the safe choice |
| FastAPI | 0.128.x | API framework | Prescribed. Vercel has first-class FastAPI support -- auto-detects from requirements.txt, becomes a single Vercel Function with Fluid Compute (handles concurrent requests in one instance) |
| Pydantic | 2.x | Request/response validation | Ships with FastAPI. v2 is Rust-backed, dramatically faster than v1. Use for all API schemas |
| Uvicorn | 0.34.x | ASGI server | Required by FastAPI for local development. Vercel handles this in production, but needed for `vercel dev` and local testing |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Neon Postgres | -- (managed) | Primary database | Prescribed. Serverless Postgres with built-in PgBouncer connection pooling. Use the `-pooler` connection string for serverless functions |
| psycopg2-binary | 2.9.x | Database driver | Battle-tested, synchronous Postgres adapter. Use `psycopg2-binary` (not `psycopg2`) to avoid compilation issues on Vercel. Neon works without code changes via standard connection string |
| SQLAlchemy | 2.0.x | ORM | Use SQLAlchemy 2.0 style (not 1.x legacy). Provides proper model definitions for complex perio charting schema (teeth, probing points, visit history). Alembic for migrations |
| Alembic | 1.15.x | Database migrations | Paired with SQLAlchemy. Essential for the complex schema (teeth, measurements, notes with versions, audit trails) |

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| pwdlib[bcrypt] | 0.2.x | Password hashing | FastAPI docs now recommend pwdlib over passlib (passlib is unmaintained, throws deprecation warnings on Python 3.12). pwdlib supports bcrypt algorithm |
| itsdangerous | 2.2.x | Session token signing | Lightweight signed-cookie sessions. No external session store needed for a demo app. Signs session data with SESSION_SECRET, validates on each request |
| python-multipart | 0.0.18+ | Form data parsing | Required by FastAPI for OAuth2-style login form handling |

### Supporting Frontend Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Recharts | 3.8.x | Analytics charts | Dashboard and perio trend visualizations. SVG-based, declarative, React-native. 3.8k+ dependents in npm -- industry standard |
| @react-pdf/renderer | 4.x | PDF generation | Patient record downloads. React-first approach -- build PDFs with JSX components. Better than jsPDF for React because it uses the same component model |
| date-fns | 4.x | Date formatting | Visit dates, audit timestamps. Tree-shakeable (unlike moment.js). Import only what you need |
| clsx | 2.x | Conditional classes | Tailwind conditional class composition. Tiny (< 1KB), no overhead |
| react-hot-toast | 2.x | Toast notifications | User feedback for save confirmations, errors. Lightweight, accessible |

### Infrastructure / Deployment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | -- (platform) | Hosting | Prescribed. Handles both static Vite SPA and Python serverless function. Fluid Compute for FastAPI concurrency |
| Neon | -- (managed) | Database hosting | Prescribed. Free tier sufficient for demo. Auto-scales, built-in connection pooling |

## Project Structure

```
periopulse/
  api/
    index.py          # FastAPI app entrypoint (exports `app`)
    routes/            # Route modules (auth, patients, charting, notes, etc.)
    models/            # SQLAlchemy models
    schemas/           # Pydantic request/response schemas
    services/          # Business logic
    seed.py            # Demo data seeder
  src/                 # React frontend (Vite)
    components/
    pages/
    hooks/
    lib/
    App.tsx
    main.tsx
  public/              # Static assets (served by Vercel CDN)
  requirements.txt     # Python dependencies
  package.json         # Node dependencies
  vite.config.ts       # Vite config
  vercel.json          # Deployment config with rewrites
  pyproject.toml       # Python project config (version, scripts)
  tsconfig.json
  tailwind.config.ts   # Tailwind customization (clinical palette)
```

## Critical Configuration: vercel.json

The `vercel.json` must route `/api/*` to the FastAPI function and everything else to the Vite SPA:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.py" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/index.py": {
      "runtime": "@vercel/python@latest"
    }
  }
}
```

The FastAPI app in `api/index.py` handles all `/api/*` routes internally. Vercel treats it as a single Fluid Compute function (not one function per endpoint).

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| DB Driver | psycopg2-binary | psycopg 3 (async) | psycopg2 is simpler for sync FastAPI endpoints. Async not needed for a demo app -- added complexity with no benefit at this scale |
| DB Driver | psycopg2-binary | asyncpg | Same reasoning. Async adds complexity; serverless functions are short-lived anyway |
| ORM | SQLAlchemy 2.0 | Raw SQL / psycopg2 | The schema is complex (teeth, measurements, versions, audit trails). ORM prevents SQL injection, provides migration support, and makes the codebase maintainable |
| ORM | SQLAlchemy 2.0 | Tortoise ORM | Tortoise is async-only and less mature. SQLAlchemy 2.0 is the Python ORM standard |
| Password hashing | pwdlib | passlib | passlib is unmaintained (last release 3+ years ago), throws deprecation warnings on Python 3.12+. FastAPI docs switched to pwdlib |
| Password hashing | pwdlib[bcrypt] | argon2 | bcrypt is the pragmatic default. argon2 is theoretically better but adds C compilation dependency that may fail on Vercel |
| CSS | Tailwind CSS 4 | CSS Modules | Tailwind is faster to build polished UIs. The clinical color palette maps perfectly to Tailwind's custom theme. Consistent spacing/typography out of the box |
| CSS | Tailwind CSS 4 | shadcn/ui | shadcn adds another layer of abstraction. For a custom dental charting UI, raw Tailwind gives more control over the medical/clinical aesthetic |
| Charts | Recharts | D3.js directly | D3 is too low-level for dashboard charts. Recharts wraps D3 with React components -- same output, 10x less code |
| Charts | Recharts | Chart.js / react-chartjs-2 | Canvas-based, not SVG. Recharts produces SVG that matches the tooth chart aesthetic. Better for print/PDF too |
| PDF | @react-pdf/renderer | jsPDF | jsPDF requires imperative API. @react-pdf/renderer uses JSX -- consistent with the rest of the React codebase |
| Dental Chart | Custom SVG | react-odontogram | react-odontogram exists but is too limited -- it handles basic odontogram display but not 6-point probing, bleeding on probing, recession, or the full perio charting workflow. The hero feature demands custom SVG for full control |
| Routing | React Router 7 | TanStack Router | React Router 7 is the ecosystem default, simpler for SPA mode, and the team likely already knows it |
| Auth | Session cookies | JWT | Session cookies are simpler, more secure by default (HttpOnly, SameSite), and appropriate for a single-domain app. JWT adds unnecessary complexity for this use case |
| Session | itsdangerous | Redis sessions | Redis adds an external dependency. Signed cookies via itsdangerous are stateless and sufficient for a demo with 4 user roles |

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| Next.js | Prescribed stack is React + Vite SPA with Python backend. Next.js would replace both Vite and the Python API |
| Prisma | JavaScript ORM -- does not work with Python backend |
| Django | Heavier than FastAPI, more opinionated. FastAPI is prescribed and better suited to API-only serverless |
| Flask | FastAPI is prescribed. Flask lacks auto-docs, Pydantic validation, and async support |
| SQLite | Explicitly forbidden in the brief. Neon Postgres is prescribed |
| Supabase | Adds another service layer. Direct Neon connection is simpler and prescribed |
| Auth0 / Clerk | Over-engineered for a demo. Session-based auth via Python backend is prescribed |
| Material UI / Ant Design | Too opinionated for a custom medical UI. Tailwind gives the control needed for clinical aesthetics |
| Zustand / Redux | Unnecessary state management complexity. React Router 7 + React context + local state are sufficient for this app |

## Installation

```bash
# Frontend
npm create vite@latest . -- --template react-ts
npm install react-router tailwindcss @tailwindcss/vite recharts @react-pdf/renderer date-fns clsx react-hot-toast

# Dev dependencies
npm install -D typescript @types/react @types/react-dom
```

```txt
# requirements.txt (Python backend)
fastapi==0.128.0
uvicorn[standard]==0.34.0
psycopg2-binary==2.9.10
sqlalchemy==2.0.38
alembic==1.15.1
pwdlib[bcrypt]==0.2.1
itsdangerous==2.2.0
python-multipart==0.0.20
pydantic==2.10.6
```

## Neon Postgres Setup

- Connection via `DATABASE_URL` environment variable
- Use the `-pooler` hostname variant for connection pooling (built-in PgBouncer in transaction mode)
- Connection string format: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`
- Set `pool_pre_ping=True` in SQLAlchemy engine to handle Neon's scale-to-zero (connections may drop after inactivity)

## Confidence Assessment

| Decision | Confidence | Rationale |
|----------|------------|-----------|
| React 19 + Vite 8 | HIGH | Verified via official Vite releases page and Vercel docs |
| Tailwind CSS 4 + Vite plugin | HIGH | Verified via official Tailwind docs and Vite integration guide |
| FastAPI on Vercel (single function) | HIGH | Verified via official Vercel FastAPI docs -- Fluid Compute, auto-detection, Python 3.12 default |
| psycopg2-binary + SQLAlchemy 2.0 | HIGH | Verified via Neon Python docs -- standard pattern, no code changes needed |
| pwdlib over passlib | MEDIUM | FastAPI docs updated to recommend pwdlib. pwdlib is newer (less community usage) but actively maintained |
| Custom SVG tooth chart | HIGH | No existing React library handles full perio charting (6-point probing, BOP, recession, mobility). Custom is the only path for the hero feature |
| @react-pdf/renderer for PDF | MEDIUM | Well-established (860K weekly downloads) but verify it bundles correctly on Vite 8 |
| Recharts 3.8 for dashboards | HIGH | 3.8K dependents, active maintenance, SVG-based, React-native API |
| Session auth via itsdangerous | HIGH | Standard pattern for Python web apps. Simpler than JWT for same-domain SPA |

## Sources

- [Vercel Python Runtime Docs](https://vercel.com/docs/functions/runtimes/python) -- Python 3.12/3.13/3.14 support, ASGI auto-detection
- [Vercel FastAPI Docs](https://vercel.com/docs/frameworks/backend/fastapi) -- Single function deployment, Fluid Compute, lifespan events
- [Vercel Vite Docs](https://vercel.com/docs/frameworks/frontend/vite) -- SPA rewrites, environment variables
- [Neon Python Connection Guide](https://neon.com/docs/guides/python) -- psycopg2/psycopg3 connection patterns
- [Neon Connection Pooling Docs](https://neon.com/docs/connect/connection-pooling) -- PgBouncer in transaction mode
- [Vite 8.0 Release](https://vite.dev/blog/announcing-vite8) -- Rolldown bundler, @vitejs/plugin-react v6
- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4) -- Vite plugin, CSS custom properties
- [FastAPI Security Docs / pwdlib discussion](https://github.com/fastapi/fastapi/discussions/11773) -- passlib deprecation, pwdlib recommendation
- [Recharts npm](https://www.npmjs.com/package/recharts) -- v3.8.0 current
- [React Router Releases](https://github.com/remix-run/react-router/releases) -- v7.13.x current
- [react-odontogram](https://github.com/biomathcode/react-odontogram) -- Evaluated and rejected (too limited for full perio charting)
