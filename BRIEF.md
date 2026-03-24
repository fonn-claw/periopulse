# PerioPulse — Dental Hygiene & Treatment Tracking

## Overview
A web application for dental practices to do fast hygiene charting, track periodontal findings, and give patients ownership of their dental history across practices. Built as a FonnIT daily showcase.

## Business Context (from market research)
- Dental PMS systems (Dentrix, EagleSoft, Open Dental) cost $300-500/month per provider but are bloated and slow
- Hygienists report spending 20%+ of their time fighting charting software
- Critical issue: assistant notes overwrite hygienist notes without audit trails — creates liability
- "I go up front to ask what happened and see my note detailing the Perio Maintenance note and a note below saying 'Adult Prophy'" — real Reddit complaint
- Patient dental history is fragmented across practices — no patient-owned portal exists
- A dentist founder validated this: "Current patient portals are usually locked to one PMS or practice-owned rather than patient-owned"

## Target Users
1. **Dental Hygienist** — Primary user. Does perio charting, records findings (pocket depths, bleeding, mobility), writes treatment notes
2. **Dentist** — Reviews charting, creates treatment plans, approves notes
3. **Office Admin** — Manages patients, scheduling, billing codes
4. **Patient** — Views their own dental history, downloads records

## Core Features

### 1. Interactive Tooth Chart (HERO FEATURE)
- SVG rendering of full adult dentition (32 teeth, numbered)
- Click a tooth → record findings: pocket depths (6 points per tooth), bleeding on probing, recession, mobility, furcation
- Color-coded severity: green (healthy), yellow (watch), orange (moderate), red (severe)
- Fast entry: click/tap to cycle through values, not type
- Full-mouth perio chart view with all 192 probing points visible
- THIS IS THE CENTERPIECE — make it visually stunning and fast to use

### 2. Note System with Audit Trail
- Hygienist creates visit notes (perio maintenance, prophy, SRP, etc.)
- Notes are LOCKED after creation — edits create new versions, not overwrites
- Full version history: who changed what, when
- Role-based: only the note author can edit within the same day; after that, append-only
- Clear visual diff between versions

### 3. Treatment Plans
- Create treatment plans linked to specific teeth/conditions
- Status tracking: proposed → accepted → in-progress → completed
- Associate billing codes (CDT codes) with procedures
- Patient can view and accept/decline treatment plans

### 4. Patient Portal
- Patient logs in to see their dental history across all visits
- Download records as PDF
- View upcoming treatment plans
- See perio trends over time (are pocket depths improving?)
- This is the "patient-owned" portal — their data, their access

### 5. Dashboard & Analytics
- Practice overview: patients seen today, upcoming appointments
- Perio trends: average pocket depths across patient population
- Hygienist productivity: patients per day, charting completion rate
- Treatment plan acceptance rate

### 6. Auth & Roles
- Role-based access: hygienist, dentist, admin, patient
- Multi-provider practice support

## Demo Data
- Practice: "Bright Smile Dental"
- 4 staff: 2 hygienists, 1 dentist, 1 admin
- 20 patients with perio history (mix of healthy, gingivitis, periodontitis)
- Historical charting data going back 6 months (showing improvement/decline trends)
- Treatment plans in various states
- Audit trail examples (showing note edit history)

### Demo Accounts
- hygienist@periopulse.app / demo1234 — Hygienist view (charting, notes)
- dentist@periopulse.app / demo1234 — Dentist view (treatment plans, review)
- admin@periopulse.app / demo1234 — Admin view (dashboard, management)
- patient@periopulse.app / demo1234 — Patient portal (own records, trends)

## Tech Stack — IMPORTANT
- **Frontend:** React (Vite) — interactive tooth chart UI
- **Backend:** Python serverless functions (FastAPI-style) in `/api/` directory
- **Database:** Neon Postgres (serverless) — NOT SQLite. Use @neondatabase/serverless or psycopg2
- **Deployment:** Vercel (supports Python + React)
- **Auth:** Session-based auth via Python backend
- This is a showcase of a React + Python stack on Vercel

## Design Requirements
- Medical/clinical color palette: clean whites, calm blues, professional greens
- The tooth chart must be the visual hero — large, interactive, responsive
- Clean data tables for patient lists and charting history
- Responsive — must work on tablet for chair-side use
- Professional enough to show dental practice owners on LinkedIn

## Technical Notes
- Neon Postgres connection string via DATABASE_URL env var
- Create the Neon database as part of build if possible, or document how to create it
- Seed script that populates all demo data
- Python dependencies in requirements.txt
- Vercel Python runtime for API routes
