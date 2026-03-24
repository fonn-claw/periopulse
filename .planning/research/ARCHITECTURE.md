# Architecture Patterns

**Domain:** Dental Hygiene Charting & Treatment Tracking Web Application
**Researched:** 2026-03-24

## Recommended Architecture

**Single-project monorepo** deployed to Vercel: React (Vite) frontend serves static assets via Vercel CDN, Python FastAPI backend runs as a single Vercel Function (Fluid Compute), Neon Postgres handles persistence.

```
Browser
  |
  +-- Static Assets (Vercel CDN) --> React SPA (Vite build output in /dist)
  |
  +-- /api/* requests --> FastAPI (single Vercel Function, Fluid Compute)
                            |
                            +-- Neon Postgres (pooled connection via PgBouncer)
```

### Why Single Function, Not Per-Route Functions

Vercel's Python runtime deploys the entire FastAPI app as **one Vercel Function** by default. This is correct for PerioPulse because:
- FastAPI's internal router handles all `/api/*` routes efficiently
- Shared database connection pool across requests (via Fluid Compute's instance reuse)
- Single cold start instead of per-route cold starts
- Simpler deployment and debugging

**Confidence: HIGH** -- Verified via Vercel official docs: "When you deploy a FastAPI app to Vercel, the application becomes a single Vercel Function and uses Fluid compute by default."

### Project File Structure

```
periopulse/
|-- api/
|   |-- index.py              # FastAPI app entrypoint (exports `app`)
|   |-- auth.py               # Auth routes (login, logout, session check)
|   |-- patients.py           # Patient CRUD routes
|   |-- charting.py           # Perio charting routes (save/load readings)
|   |-- notes.py              # Visit notes with version history
|   |-- treatments.py         # Treatment plan routes
|   |-- dashboard.py          # Analytics/aggregation routes
|   |-- pdf.py                # PDF generation for patient records
|   |-- db.py                 # Database connection pool & helpers
|   |-- models.py             # Pydantic models for request/response
|   |-- middleware.py          # Auth middleware, CORS
|   |-- seed.py               # Database seeding script
|   |-- schema.sql             # DDL for all tables
|-- src/
|   |-- App.tsx
|   |-- main.tsx
|   |-- components/
|   |   |-- tooth-chart/       # Hero SVG tooth chart components
|   |   |-- notes/             # Note editor with version history
|   |   |-- treatments/        # Treatment plan views
|   |   |-- dashboard/         # Analytics charts
|   |   |-- patients/          # Patient list and detail
|   |   |-- auth/              # Login form, role guard
|   |   |-- layout/            # Shell, nav, sidebar
|   |-- hooks/                 # Custom React hooks (useAuth, useApi, etc.)
|   |-- lib/                   # API client, utilities
|   |-- types/                 # TypeScript type definitions
|-- public/                    # Static assets (served via Vercel CDN)
|-- requirements.txt           # Python dependencies
|-- package.json               # Node/React dependencies
|-- vite.config.ts
|-- vercel.json                # Routing config
|-- tsconfig.json
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **React SPA** | All UI rendering, client-side routing, SVG tooth chart interaction, form state | FastAPI via REST API calls |
| **FastAPI App** | Auth, business logic, data validation, RBAC enforcement | Neon Postgres via psycopg pool |
| **Neon Postgres** | Persistent storage, data integrity, audit trail | FastAPI only (no direct browser access) |
| **Vercel CDN** | Serves built React assets, caches static files | Browser directly |
| **Tooth Chart (React)** | SVG rendering, click/tap interaction, local state for in-progress charting | Parent React components, submits to API on save |
| **PDF Generator** | Server-side PDF creation from patient data | FastAPI route, uses reportlab or weasyprint |

### Data Flow

**Charting Flow (primary workflow):**
```
1. Hygienist opens patient -> React fetches patient data + latest charting from API
2. Tooth chart renders SVG with historical data color-coded
3. Hygienist clicks teeth, cycles values -> state held in React (no API calls yet)
4. Hygienist saves charting -> POST /api/charting with full 192-point dataset
5. FastAPI validates, stores as new charting_session row + individual readings
6. Response confirms save -> React updates UI with saved state
```

**Note Audit Trail Flow:**
```
1. Hygienist writes visit note -> POST /api/notes (creates version 1)
2. Same-day edit by author -> PUT /api/notes/{id} (creates version 2, version 1 preserved)
3. After 24h or different user -> POST /api/notes/{id}/addendum (append-only)
4. Version history -> GET /api/notes/{id}/history (returns all versions with diffs)
```

**Auth Flow:**
```
1. User submits credentials -> POST /api/auth/login
2. FastAPI validates against users table (bcrypt hashed passwords)
3. Creates session row in sessions table, returns signed session cookie (HttpOnly, Secure)
4. Subsequent requests include cookie -> middleware validates session, attaches user context
5. Logout -> DELETE /api/auth/logout -> deletes session row, clears cookie
```

**Why server-side sessions stored in Postgres, not JWTs:**
- Sessions can be revoked immediately (important for medical context)
- No token size bloat with role/practice data
- Session table is tiny and Neon handles it fine
- Serverless cold starts don't matter -- session lookup is a simple indexed query

**Confidence: MEDIUM** -- Session-in-DB is a well-established pattern; the only risk is connection overhead per request, mitigated by Neon's PgBouncer pooling.

## Patterns to Follow

### Pattern 1: Optimistic Local State for Charting

**What:** Hold all charting edits in React state during a session. Only persist on explicit save.
**When:** Any interactive data entry screen (tooth chart, note editing).
**Why:** Avoids 192 individual API calls per probing session. Hygienists need speed -- round-trips kill chair-side UX.

```typescript
// React state holds in-progress charting
const [readings, setReadings] = useState<PerioReading[]>(initialReadings);

// Click handler cycles value locally
const handleProbeClick = (toothId: number, site: number) => {
  setReadings(prev => prev.map(r =>
    r.toothId === toothId && r.site === site
      ? { ...r, depth: cycleDepth(r.depth) }
      : r
  ));
};

// Single save sends entire dataset
const saveCharting = () => api.post('/api/charting', { patientId, readings });
```

### Pattern 2: Immutable Notes with Version Chain

**What:** Notes are never updated in place. Edits create new rows linked to the original.
**When:** Any clinical note creation or modification.
**Why:** Core differentiator -- solves the "assistant overwrites hygienist notes" problem.

```sql
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES notes(id),  -- NULL for originals
  visit_id INTEGER NOT NULL REFERENCES visits(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  note_type VARCHAR(50) NOT NULL,  -- 'perio_maintenance', 'prophy', 'srp', etc.
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_addendum BOOLEAN DEFAULT FALSE
);
-- parent_id chains versions: original -> edit1 -> edit2
-- is_addendum distinguishes same-author edits from cross-author addenda
```

### Pattern 3: Role-Based Route Guards (Both Layers)

**What:** Enforce RBAC in both React (UI hiding) and FastAPI (actual enforcement).
**When:** Every route and every API endpoint.
**Why:** Frontend guards are UX; backend guards are security. Never trust only one layer.

```python
# FastAPI dependency
def require_role(*roles):
    async def check(request: Request):
        user = request.state.user
        if user.role not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return Depends(check)

@app.get("/api/dashboard/analytics")
async def analytics(user=require_role("admin", "dentist")):
    ...
```

### Pattern 4: Neon Connection Pool via Lifespan

**What:** Create psycopg async connection pool at FastAPI startup, close at shutdown.
**When:** Always -- this is how the app connects to Neon.
**Why:** Reuses connections across requests within the same Fluid Compute instance. Avoids per-request connection overhead.

```python
from contextlib import asynccontextmanager
from psycopg_pool import AsyncConnectionPool

pool: AsyncConnectionPool | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = AsyncConnectionPool(
        conninfo=os.environ["DATABASE_URL"],
        min_size=1,
        max_size=5,  # Conservative for serverless
    )
    await pool.open()
    yield
    await pool.close()

app = FastAPI(lifespan=lifespan)
```

**Important:** Use the Neon pooled connection string (with `-pooler` suffix) so Neon's PgBouncer handles connection multiplexing. Keep `max_size` low (3-5) since serverless instances should not hog connections.

**Confidence: HIGH** -- Verified via Neon docs that PgBouncer in transaction mode is the recommended approach.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-Probe-Point API Calls
**What:** Sending an API request every time the hygienist clicks a probing site.
**Why bad:** 192 sites per full-mouth chart = 192 requests. Unusable latency, serverless cost explosion.
**Instead:** Batch all readings in React state, save as one POST with the complete dataset.

### Anti-Pattern 2: Mutable Clinical Notes
**What:** UPDATE notes SET content = ... WHERE id = ...
**Why bad:** Destroys the audit trail. This is literally the #1 complaint about existing dental PMS systems. Creates legal liability.
**Instead:** Insert new version rows. Never UPDATE note content. Display version history with diffs.

### Anti-Pattern 3: SQL-Level PREPARE Statements with Neon
**What:** Using `PREPARE`/`EXECUTE` SQL statements through PgBouncer.
**Why bad:** Neon's PgBouncer in transaction mode does not support SQL-level prepared statements. Queries will fail silently or error.
**Instead:** Use protocol-level prepared statements via psycopg's `prepare=True` parameter, which PgBouncer 1.22+ supports.

### Anti-Pattern 4: SET search_path with Neon Pooling
**What:** Using `SET search_path` or other session-level SET commands.
**Why bad:** PgBouncer in transaction mode returns connections to the pool after each transaction. SET state is lost.
**Instead:** Use fully-qualified table names or set search_path in the connection string parameters.

### Anti-Pattern 5: Fat API Responses for Charting
**What:** Returning entire patient history when loading the tooth chart.
**Why bad:** A patient with 6 months of biweekly visits has ~12 charting sessions x 192 readings = 2,300+ rows. Slow to render.
**Instead:** Load latest charting by default. Trend data loaded separately and lazily when the user views the trends tab.

## Database Schema (Key Tables)

```
practices
  |-- users (staff: hygienist, dentist, admin)
  |-- patients
        |-- visits
        |     |-- charting_sessions
        |     |     |-- charting_readings (192 per full-mouth session)
        |     |-- notes (immutable, version-chained)
        |-- treatment_plans
              |-- treatment_items (linked to teeth, CDT codes)
sessions (auth sessions, not visit sessions)
```

**Key relationships:**
- A practice has many users and patients
- A patient has many visits; each visit belongs to one patient and one provider
- A charting_session belongs to a visit; readings belong to a session
- Notes chain via parent_id for version history
- Treatment plans contain items, each linked to specific teeth

## Vercel Routing Configuration

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.py" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

This routes:
- `/api/*` requests to the FastAPI app (single function)
- Everything else to the React SPA (client-side routing handles it)

**Confidence: MEDIUM** -- This is the standard pattern for SPA + API on Vercel, but the exact rewrite syntax for Python apps may need adjustment based on how Vercel detects the FastAPI framework. May need `"framework": null` in project settings if Vercel auto-detects the wrong framework.

## Scalability Considerations

| Concern | Demo (20 patients) | 100 patients | 1,000 patients |
|---------|---------------------|--------------|----------------|
| Charting data volume | ~4K readings | ~20K readings | ~200K readings |
| API response time | <50ms | <100ms | <200ms (index on patient_id, visit_date) |
| Neon connections | 1-2 concurrent | 3-5 concurrent | Neon pooler handles up to 64 |
| Cold starts | Noticeable (~1-2s) | Same | Same (Fluid Compute mitigates with reuse) |
| PDF generation | <1s | <1s | <2s (single patient at a time) |

**For the demo/showcase scope, scalability is not a concern.** The architecture is sound for a real practice (1,000 patients) without changes. Beyond that would need dedicated compute, not serverless.

## Suggested Build Order

Based on dependency analysis, build in this order:

1. **Database schema + seeding** -- Everything depends on data. Define tables, seed demo data first.
2. **Auth system** -- Every API route needs auth middleware. Build login/session/RBAC before feature routes.
3. **Patient CRUD** -- Basic patient list/detail. Foundation for charting and notes.
4. **Interactive Tooth Chart (hero)** -- The centerpiece. Depends on patients and charting tables. Most complex frontend work.
5. **Notes with audit trail** -- Depends on visits (created during charting). Core differentiator.
6. **Treatment plans** -- Depends on patients and tooth data. Links to charting findings.
7. **Patient portal** -- Read-only views of existing data. Depends on charting, notes, and treatment plans existing.
8. **Dashboard & analytics** -- Aggregation queries over existing data. Build last since it just reads what other features write.
9. **PDF export** -- Nice-to-have, depends on patient data being complete. Can be last.

**Rationale:** Each phase produces visible, testable output. The tooth chart is phase 4 (not phase 1) because it needs the data layer and auth to function, but it should be the first major feature after infrastructure is in place.

## Sources

- [Vercel Python Runtime Docs](https://vercel.com/docs/functions/runtimes/python) -- HIGH confidence, official docs
- [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi) -- HIGH confidence, official docs
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling) -- HIGH confidence, official docs
- [react-odontogram](https://github.com/biomathcode/react-odontogram) -- Reference for SVG dental chart approach
- [jacobwalkr/dental-chart](https://github.com/jacobwalkr/dental-chart) -- Reference for simple SVG dental charting
- [Vercel Community: React + FastAPI](https://community.vercel.com/t/deploying-a-react-ts-frontend-with-fastapi-python-backend/967) -- MEDIUM confidence, community discussion
