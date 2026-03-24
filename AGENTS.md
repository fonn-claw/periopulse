# AGENTS.md — Build Instructions

## Context
This is a FonnIT daily build project. Read BRIEF.md for what to build.

## CRITICAL: Single-Session Build
Complete the ENTIRE app in this single session. Do NOT stop between phases.
Do NOT suggest `/clear` or context resets. Auto-advance through all phases.
Make ALL domain decisions yourself — reasonable defaults, don't block on questions.

## Domain Decisions
Make ALL domain and business logic decisions yourself using reasonable defaults.
Do NOT ask questions or wait for clarification. Keep building.

## Methodology
Use GSD (get-shit-done) for the full build lifecycle:
1. Initialize: /gsd:new-project --auto @BRIEF.md (use all recommended defaults)
2. For EACH phase: discuss → ui-spec (if frontend) → plan → execute → verify
3. Auto-advance through ALL phases without human intervention
4. After all phases: /gsd:ship

## UI Quality
This app will be showcased on LinkedIn. Professional spacing,
consistent colors, polished typography.

## Standards
- Demo data seeded and realistic
- Build must pass before handoff
- Responsive design (tablet-friendly for chair-side use)

## Deploy
When finished, push to GitHub:
- git remote add origin https://github.com/fonn-claw/periopulse.git
- git push -u origin main

Then deploy to Vercel:
- npx vercel --yes
- npx vercel domains add periopulse.demos.fonnit.com
- npx vercel --prod

Set required env vars on Vercel:
- DATABASE_URL (Neon connection string)
- SESSION_SECRET (generate a 32+ char random string)

## On Completion
When completely finished, run:
openclaw system event --text "BUILD COMPLETE: PerioPulse — Dental Hygiene & Treatment Tracking" --mode now
