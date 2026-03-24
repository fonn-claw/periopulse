import os
import json
import secrets
from datetime import datetime, timedelta, date
from decimal import Decimal

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import psycopg
from psycopg.rows import dict_row
import bcrypt
from itsdangerous import URLSafeTimedSerializer

app = FastAPI()

SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production-1234")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
SESSION_MAX_AGE = 86400 * 7  # 7 days

serializer = URLSafeTimedSerializer(SESSION_SECRET)


def get_db():
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True)
    return conn


def get_session_user(request: Request):
    token = request.cookies.get("session")
    if not token:
        return None
    try:
        data = serializer.loads(token, max_age=SESSION_MAX_AGE)
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, email, name, role, practice_id FROM users WHERE id = %s", (data["user_id"],))
                user = cur.fetchone()
                return dict(user) if user else None
    except Exception:
        return None


def require_auth(request: Request):
    user = get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_role(request: Request, *roles):
    user = require_auth(request)
    if user["role"] not in roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user


def _serialize(row):
    if row is None:
        return None
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
        elif isinstance(v, Decimal):
            d[k] = float(v)
    return d


# ─── Auth ───

@app.post("/api/auth/login")
async def login(request: Request):
    body = await request.json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, name, role, password_hash, practice_id FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = serializer.dumps({"user_id": user["id"]})
    response = JSONResponse({"user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"], "practice_id": user["practice_id"]}})
    response.set_cookie("session", token, httponly=True, samesite="lax", max_age=SESSION_MAX_AGE, path="/")
    return response


@app.post("/api/auth/logout")
async def logout():
    response = JSONResponse({"ok": True})
    response.delete_cookie("session", path="/")
    return response


@app.get("/api/auth/me")
async def me(request: Request):
    user = get_session_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ─── Patients ───

@app.get("/api/patients")
async def list_patients(request: Request):
    user = require_auth(request)
    search = request.query_params.get("search", "")
    with get_db() as conn:
        with conn.cursor() as cur:
            if user["role"] == "patient":
                cur.execute("SELECT id, first_name, last_name, date_of_birth, phone, email, created_at, user_id FROM patients WHERE user_id = %s", (user["id"],))
            elif search:
                cur.execute("""
                    SELECT p.id, p.first_name, p.last_name, p.date_of_birth, p.phone, p.email, p.created_at, p.user_id,
                           (SELECT MAX(v.visit_date) FROM visits v WHERE v.patient_id = p.id) as last_visit
                    FROM patients p WHERE p.practice_id = %s AND (p.first_name ILIKE %s OR p.last_name ILIKE %s)
                    ORDER BY p.last_name, p.first_name
                """, (user["practice_id"], f"%{search}%", f"%{search}%"))
            else:
                cur.execute("""
                    SELECT p.id, p.first_name, p.last_name, p.date_of_birth, p.phone, p.email, p.created_at, p.user_id,
                           (SELECT MAX(v.visit_date) FROM visits v WHERE v.patient_id = p.id) as last_visit
                    FROM patients p WHERE p.practice_id = %s ORDER BY p.last_name, p.first_name
                """, (user["practice_id"],))
            return [_serialize(r) for r in cur.fetchall()]


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: int, request: Request):
    user = require_auth(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM patients WHERE id = %s", (patient_id,))
            patient = cur.fetchone()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _serialize(patient)


@app.post("/api/patients")
async def create_patient(request: Request):
    user = require_role(request, "hygienist", "dentist", "admin")
    body = await request.json()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO patients (first_name, last_name, date_of_birth, phone, email, practice_id)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
            """, (body["first_name"], body["last_name"], body.get("date_of_birth") or None, body.get("phone"), body.get("email"), user["practice_id"]))
            return _serialize(cur.fetchone())


# ─── Visits ───

@app.get("/api/patients/{patient_id}/visits")
async def list_visits(patient_id: int, request: Request):
    user = require_auth(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT v.*, u.name as provider_name FROM visits v
                LEFT JOIN users u ON v.provider_id = u.id
                WHERE v.patient_id = %s ORDER BY v.visit_date DESC
            """, (patient_id,))
            return [_serialize(r) for r in cur.fetchall()]


@app.post("/api/patients/{patient_id}/visits")
async def create_visit(patient_id: int, request: Request):
    user = require_role(request, "hygienist", "dentist")
    body = await request.json()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO visits (patient_id, provider_id, visit_date, visit_type)
                VALUES (%s, %s, %s, %s) RETURNING *
            """, (patient_id, user["id"], body.get("visit_date", date.today().isoformat()), body.get("visit_type", "perio_maintenance")))
            return _serialize(cur.fetchone())


# ─── Perio Charting ───

@app.get("/api/visits/{visit_id}/charting")
async def get_charting(visit_id: int, request: Request):
    user = require_auth(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT pc.*, pr.tooth_number, pr.site, pr.pocket_depth, pr.recession,
                       pr.bleeding_on_probing, pr.suppuration
                FROM perio_charts pc
                LEFT JOIN perio_readings pr ON pr.chart_id = pc.id
                WHERE pc.visit_id = %s
            """, (visit_id,))
            rows = cur.fetchall()
    if not rows or rows[0]["id"] is None:
        return {"chart": None, "readings": []}
    chart = {"id": rows[0]["id"], "visit_id": visit_id, "created_at": str(rows[0].get("created_at", ""))}
    readings = [{"tooth_number": r["tooth_number"], "site": r["site"], "pocket_depth": r["pocket_depth"],
                 "recession": r["recession"], "bleeding_on_probing": r["bleeding_on_probing"],
                 "suppuration": r["suppuration"]} for r in rows if r["tooth_number"] is not None]
    return {"chart": chart, "readings": readings}


@app.get("/api/patients/{patient_id}/charting-history")
async def get_charting_history(patient_id: int, request: Request):
    user = require_auth(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT v.visit_date, v.id as visit_id, pr.tooth_number, pr.site,
                       pr.pocket_depth, pr.recession, pr.bleeding_on_probing
                FROM visits v
                JOIN perio_charts pc ON pc.visit_id = v.id
                JOIN perio_readings pr ON pr.chart_id = pc.id
                WHERE v.patient_id = %s ORDER BY v.visit_date ASC
            """, (patient_id,))
            return [_serialize(r) for r in cur.fetchall()]


@app.post("/api/visits/{visit_id}/charting")
async def save_charting(visit_id: int, request: Request):
    user = require_role(request, "hygienist", "dentist")
    body = await request.json()
    readings = body.get("readings", [])
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM perio_charts WHERE visit_id = %s", (visit_id,))
            chart = cur.fetchone()
            if chart:
                chart_id = chart["id"]
                cur.execute("DELETE FROM perio_readings WHERE chart_id = %s", (chart_id,))
            else:
                cur.execute("INSERT INTO perio_charts (visit_id, provider_id) VALUES (%s, %s) RETURNING id", (visit_id, user["id"]))
                chart_id = cur.fetchone()["id"]
            for r in readings:
                cur.execute("""
                    INSERT INTO perio_readings (chart_id, tooth_number, site, pocket_depth, recession, bleeding_on_probing, suppuration)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (chart_id, r["tooth_number"], r["site"], r.get("pocket_depth", 0),
                      r.get("recession", 0), r.get("bleeding_on_probing", False), r.get("suppuration", False)))
    return {"chart_id": chart_id, "readings_count": len(readings)}


# ─── Tooth-level data ───

@app.get("/api/visits/{visit_id}/tooth-data")
async def get_tooth_data(visit_id: int, request: Request):
    user = require_auth(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM tooth_findings WHERE visit_id = %s", (visit_id,))
            return [_serialize(r) for r in cur.fetchall()]


@app.post("/api/visits/{visit_id}/tooth-data")
async def save_tooth_data(visit_id: int, request: Request):
    user = require_role(request, "hygienist", "dentist")
    body = await request.json()
    findings = body.get("findings", [])
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM tooth_findings WHERE visit_id = %s", (visit_id,))
            for f in findings:
                cur.execute("""
                    INSERT INTO tooth_findings (visit_id, tooth_number, mobility, furcation, missing, implant)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (visit_id, f["tooth_number"], f.get("mobility", 0), f.get("furcation", 0),
                      f.get("missing", False), f.get("implant", False)))
    return {"ok": True}


# ─── Notes with audit trail ───

@app.get("/api/patients/{patient_id}/notes")
async def list_notes(patient_id: int, request: Request):
    user = require_auth(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT n.*, u.name as author_name FROM clinical_notes n
                JOIN users u ON n.author_id = u.id WHERE n.patient_id = %s ORDER BY n.created_at DESC
            """, (patient_id,))
            return [_serialize(r) for r in cur.fetchall()]


@app.get("/api/notes/{note_id}")
async def get_note(note_id: int, request: Request):
    user = require_auth(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT n.*, u.name as author_name FROM clinical_notes n JOIN users u ON n.author_id = u.id WHERE n.id = %s", (note_id,))
            note = cur.fetchone()
            if not note:
                raise HTTPException(status_code=404, detail="Note not found")
            cur.execute("""
                SELECT nv.*, u.name as editor_name FROM note_versions nv
                JOIN users u ON nv.editor_id = u.id WHERE nv.note_id = %s ORDER BY nv.version_number ASC
            """, (note_id,))
            versions = cur.fetchall()
    return {"note": _serialize(note), "versions": [_serialize(v) for v in versions]}


@app.post("/api/patients/{patient_id}/notes")
async def create_note(patient_id: int, request: Request):
    user = require_role(request, "hygienist", "dentist")
    body = await request.json()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO clinical_notes (patient_id, visit_id, author_id, note_type, content)
                VALUES (%s, %s, %s, %s, %s) RETURNING *
            """, (patient_id, body.get("visit_id"), user["id"], body.get("note_type", "general"), body["content"]))
            note = cur.fetchone()
            cur.execute("INSERT INTO note_versions (note_id, version_number, content, editor_id, change_summary) VALUES (%s, 1, %s, %s, 'Initial version')",
                        (note["id"], body["content"], user["id"]))
    return _serialize(note)


@app.post("/api/notes/{note_id}/edit")
async def edit_note(note_id: int, request: Request):
    user = require_role(request, "hygienist", "dentist")
    body = await request.json()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM clinical_notes WHERE id = %s", (note_id,))
            note = cur.fetchone()
            if not note:
                raise HTTPException(status_code=404, detail="Note not found")
            is_author = note["author_id"] == user["id"]
            is_same_day = note["created_at"].date() == date.today()
            content = body["content"]
            if not is_author or not is_same_day:
                content = note["content"] + "\n\n--- Addendum by " + user["name"] + " ---\n" + content
            cur.execute("SELECT MAX(version_number) as max_v FROM note_versions WHERE note_id = %s", (note_id,))
            max_v = cur.fetchone()["max_v"] or 0
            cur.execute("INSERT INTO note_versions (note_id, version_number, content, editor_id, change_summary) VALUES (%s, %s, %s, %s, %s)",
                        (note_id, max_v + 1, content, user["id"], body.get("change_summary", "Edit")))
            cur.execute("UPDATE clinical_notes SET content = %s, updated_at = NOW() WHERE id = %s", (content, note_id))
    return {"ok": True, "version": max_v + 1}


# ─── Treatment Plans ───

@app.get("/api/patients/{patient_id}/treatments")
async def list_treatments(patient_id: int, request: Request):
    user = require_auth(request)
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT t.*, u.name as provider_name FROM treatment_plans t
                JOIN users u ON t.provider_id = u.id WHERE t.patient_id = %s ORDER BY t.created_at DESC
            """, (patient_id,))
            plans = cur.fetchall()
            plan_ids = [p["id"] for p in plans]
            items_by_plan = {}
            if plan_ids:
                cur.execute("SELECT * FROM treatment_items WHERE plan_id = ANY(%s) ORDER BY tooth_number", (plan_ids,))
                for item in cur.fetchall():
                    items_by_plan.setdefault(item["plan_id"], []).append(_serialize(item))
    result = []
    for p in plans:
        pd = _serialize(p)
        pd["items"] = items_by_plan.get(p["id"], [])
        result.append(pd)
    return result


@app.post("/api/patients/{patient_id}/treatments")
async def create_treatment(patient_id: int, request: Request):
    user = require_role(request, "dentist", "hygienist")
    body = await request.json()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO treatment_plans (patient_id, provider_id, title, status, notes)
                VALUES (%s, %s, %s, 'proposed', %s) RETURNING *
            """, (patient_id, user["id"], body["title"], body.get("notes", "")))
            plan = cur.fetchone()
            for item in body.get("items", []):
                cur.execute("""
                    INSERT INTO treatment_items (plan_id, tooth_number, procedure_name, cdt_code, fee, status)
                    VALUES (%s, %s, %s, %s, %s, 'proposed')
                """, (plan["id"], item.get("tooth_number") or None, item["procedure_name"], item.get("cdt_code"), item.get("fee", 0)))
    return _serialize(plan)


@app.patch("/api/treatments/{plan_id}/status")
async def update_treatment_status(plan_id: int, request: Request):
    user = require_auth(request)
    body = await request.json()
    new_status = body["status"]
    valid = ["proposed", "accepted", "in_progress", "completed", "declined"]
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE treatment_plans SET status = %s, updated_at = NOW() WHERE id = %s RETURNING *", (new_status, plan_id))
            plan = cur.fetchone()
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found")
    return _serialize(plan)


# ─── Dashboard ───

@app.get("/api/dashboard")
async def dashboard(request: Request):
    user = require_role(request, "hygienist", "dentist", "admin")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM patients WHERE practice_id = %s", (user["practice_id"],))
            total_patients = cur.fetchone()["count"]

            cur.execute("SELECT COUNT(*) as count FROM visits v JOIN patients p ON v.patient_id = p.id WHERE p.practice_id = %s AND v.visit_date = CURRENT_DATE", (user["practice_id"],))
            today_visits = cur.fetchone()["count"]

            cur.execute("SELECT status, COUNT(*) as count FROM treatment_plans t JOIN patients p ON t.patient_id = p.id WHERE p.practice_id = %s GROUP BY status", (user["practice_id"],))
            treatment_stats = {r["status"]: r["count"] for r in cur.fetchall()}

            cur.execute("""
                SELECT v.visit_date, AVG(pr.pocket_depth) as avg_depth, COUNT(DISTINCT v.patient_id) as patient_count
                FROM visits v JOIN patients p ON v.patient_id = p.id
                JOIN perio_charts pc ON pc.visit_id = v.id JOIN perio_readings pr ON pr.chart_id = pc.id
                WHERE p.practice_id = %s GROUP BY v.visit_date ORDER BY v.visit_date
            """, (user["practice_id"],))
            perio_trends = [_serialize(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT v.*, p.first_name, p.last_name, u.name as provider_name
                FROM visits v JOIN patients p ON v.patient_id = p.id
                LEFT JOIN users u ON v.provider_id = u.id
                WHERE p.practice_id = %s ORDER BY v.visit_date DESC LIMIT 10
            """, (user["practice_id"],))
            recent_visits = [_serialize(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT u.name, u.role, COUNT(v.id) as visit_count FROM users u
                LEFT JOIN visits v ON v.provider_id = u.id AND v.visit_date >= CURRENT_DATE - INTERVAL '30 days'
                WHERE u.practice_id = %s AND u.role IN ('hygienist', 'dentist')
                GROUP BY u.id, u.name, u.role
            """, (user["practice_id"],))
            productivity = [_serialize(r) for r in cur.fetchall()]

    return {
        "total_patients": total_patients, "today_visits": today_visits,
        "treatment_stats": treatment_stats, "perio_trends": perio_trends,
        "recent_visits": recent_visits, "productivity": productivity,
    }


# ─── Patient Portal ───

@app.get("/api/portal/summary")
async def portal_summary(request: Request):
    user = require_role(request, "patient")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM patients WHERE user_id = %s", (user["id"],))
            patient = cur.fetchone()
            if not patient:
                raise HTTPException(status_code=404, detail="Patient record not found")
            pid = patient["id"]

            cur.execute("SELECT v.*, u.name as provider_name FROM visits v LEFT JOIN users u ON v.provider_id = u.id WHERE v.patient_id = %s ORDER BY v.visit_date DESC", (pid,))
            visits = [_serialize(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT v.visit_date, AVG(pr.pocket_depth) as avg_depth,
                       SUM(CASE WHEN pr.bleeding_on_probing THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100 as bop_percent
                FROM visits v JOIN perio_charts pc ON pc.visit_id = v.id JOIN perio_readings pr ON pr.chart_id = pc.id
                WHERE v.patient_id = %s GROUP BY v.visit_date ORDER BY v.visit_date
            """, (pid,))
            perio_trends = [_serialize(r) for r in cur.fetchall()]

            cur.execute("SELECT t.*, u.name as provider_name FROM treatment_plans t JOIN users u ON t.provider_id = u.id WHERE t.patient_id = %s ORDER BY t.created_at DESC", (pid,))
            treatments = [_serialize(r) for r in cur.fetchall()]

            cur.execute("SELECT n.*, u.name as author_name FROM clinical_notes n JOIN users u ON n.author_id = u.id WHERE n.patient_id = %s ORDER BY n.created_at DESC", (pid,))
            notes = [_serialize(r) for r in cur.fetchall()]

    return {"patient": _serialize(patient), "visits": visits, "perio_trends": perio_trends, "treatments": treatments, "notes": notes}


# ─── DB Setup ───

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS practices (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL CHECK (role IN ('hygienist','dentist','admin','patient')), practice_id INTEGER REFERENCES practices(id), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS patients (id SERIAL PRIMARY KEY, first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL, date_of_birth DATE, phone VARCHAR(50), email VARCHAR(255), user_id INTEGER REFERENCES users(id), practice_id INTEGER REFERENCES practices(id), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS visits (id SERIAL PRIMARY KEY, patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE, provider_id INTEGER REFERENCES users(id), visit_date DATE NOT NULL DEFAULT CURRENT_DATE, visit_type VARCHAR(100) DEFAULT 'perio_maintenance', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS perio_charts (id SERIAL PRIMARY KEY, visit_id INTEGER UNIQUE REFERENCES visits(id) ON DELETE CASCADE, provider_id INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS perio_readings (id SERIAL PRIMARY KEY, chart_id INTEGER REFERENCES perio_charts(id) ON DELETE CASCADE, tooth_number INTEGER NOT NULL CHECK (tooth_number BETWEEN 1 AND 32), site VARCHAR(20) NOT NULL CHECK (site IN ('DB','B','MB','DL','L','ML')), pocket_depth INTEGER DEFAULT 0, recession INTEGER DEFAULT 0, bleeding_on_probing BOOLEAN DEFAULT FALSE, suppuration BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS tooth_findings (id SERIAL PRIMARY KEY, visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE, tooth_number INTEGER NOT NULL CHECK (tooth_number BETWEEN 1 AND 32), mobility INTEGER DEFAULT 0 CHECK (mobility BETWEEN 0 AND 3), furcation INTEGER DEFAULT 0 CHECK (furcation BETWEEN 0 AND 3), missing BOOLEAN DEFAULT FALSE, implant BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS clinical_notes (id SERIAL PRIMARY KEY, patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE, visit_id INTEGER REFERENCES visits(id), author_id INTEGER REFERENCES users(id), note_type VARCHAR(100) DEFAULT 'general', content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS note_versions (id SERIAL PRIMARY KEY, note_id INTEGER REFERENCES clinical_notes(id) ON DELETE CASCADE, version_number INTEGER NOT NULL, content TEXT NOT NULL, editor_id INTEGER REFERENCES users(id), change_summary VARCHAR(500), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS treatment_plans (id SERIAL PRIMARY KEY, patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE, provider_id INTEGER REFERENCES users(id), title VARCHAR(500) NOT NULL, status VARCHAR(50) DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','in_progress','completed','declined')), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS treatment_items (id SERIAL PRIMARY KEY, plan_id INTEGER REFERENCES treatment_plans(id) ON DELETE CASCADE, tooth_number INTEGER, procedure_name VARCHAR(500) NOT NULL, cdt_code VARCHAR(20), fee NUMERIC(10,2) DEFAULT 0, status VARCHAR(50) DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','in_progress','completed','declined')));
CREATE INDEX IF NOT EXISTS idx_patients_practice ON patients(practice_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_perio_readings_chart ON perio_readings(chart_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_patient ON treatment_plans(patient_id);
"""


@app.post("/api/setup")
async def setup_db(request: Request):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
    return {"ok": True, "message": "Schema created"}


@app.post("/api/seed")
async def seed_db(request: Request):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
            cur.execute("SELECT COUNT(*) as count FROM users")
            if cur.fetchone()["count"] > 0:
                for t in ['note_versions','clinical_notes','treatment_items','treatment_plans','perio_readings','perio_charts','tooth_findings','visits','patients','users','practices']:
                    cur.execute(f"DELETE FROM {t}")
            _seed_data(cur)
    return {"ok": True, "message": "Demo data seeded"}


def _seed_data(cur):
    import random
    pw = bcrypt.hashpw(b"demo1234", bcrypt.gensalt()).decode()

    cur.execute("INSERT INTO practices (name) VALUES ('Bright Smile Dental') RETURNING id")
    practice_id = cur.fetchone()["id"]

    staff = [
        ("hygienist@periopulse.app", "Sarah Chen", "hygienist"),
        ("dentist@periopulse.app", "Dr. James Wilson", "dentist"),
        ("admin@periopulse.app", "Maria Garcia", "admin"),
        ("lisa.park@periopulse.app", "Lisa Park", "hygienist"),
    ]
    staff_ids = {}
    for email, name, role in staff:
        cur.execute("INSERT INTO users (email, password_hash, name, role, practice_id) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                    (email, pw, name, role, practice_id))
        staff_ids[role + "_" + name.split()[0].lower()] = cur.fetchone()["id"]

    hygienist_id = staff_ids["hygienist_sarah"]
    hygienist2_id = staff_ids["hygienist_lisa"]
    dentist_id = staff_ids["dentist_dr."]

    cur.execute("INSERT INTO users (email, password_hash, name, role, practice_id) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                ("patient@periopulse.app", pw, "Robert Taylor", "patient", practice_id))
    patient_user_id = cur.fetchone()["id"]

    patient_data = [
        ("Robert", "Taylor", "1985-03-15", "(555) 100-0001", "robert.taylor@email.com", patient_user_id),
        ("Jennifer", "Adams", "1978-07-22", "(555) 100-0002", "jennifer.adams@email.com", None),
        ("Michael", "Brown", "1990-11-08", "(555) 100-0003", "michael.brown@email.com", None),
        ("Emily", "Davis", "1982-05-30", "(555) 100-0004", "emily.davis@email.com", None),
        ("David", "Martinez", "1975-09-12", "(555) 100-0005", "david.martinez@email.com", None),
        ("Sarah", "Johnson", "1995-01-25", "(555) 100-0006", "sarah.johnson@email.com", None),
        ("James", "Williams", "1968-12-03", "(555) 100-0007", "james.williams@email.com", None),
        ("Amanda", "Jones", "1988-04-17", "(555) 100-0008", "amanda.jones@email.com", None),
        ("Christopher", "Garcia", "1992-08-09", "(555) 100-0009", "chris.garcia@email.com", None),
        ("Michelle", "Rodriguez", "1980-06-14", "(555) 100-0010", "michelle.rodriguez@email.com", None),
        ("Daniel", "Lee", "1973-02-28", "(555) 100-0011", "daniel.lee@email.com", None),
        ("Lisa", "Anderson", "1997-10-20", "(555) 100-0012", "lisa.anderson@email.com", None),
        ("Kevin", "Thomas", "1965-11-05", "(555) 100-0013", "kevin.thomas@email.com", None),
        ("Rachel", "Jackson", "1984-07-31", "(555) 100-0014", "rachel.jackson@email.com", None),
        ("Brian", "White", "1991-03-22", "(555) 100-0015", "brian.white@email.com", None),
        ("Stephanie", "Harris", "1977-09-18", "(555) 100-0016", "stephanie.harris@email.com", None),
        ("Andrew", "Clark", "1986-01-07", "(555) 100-0017", "andrew.clark@email.com", None),
        ("Nicole", "Lewis", "1993-12-11", "(555) 100-0018", "nicole.lewis@email.com", None),
        ("Mark", "Walker", "1970-04-25", "(555) 100-0019", "mark.walker@email.com", None),
        ("Jessica", "Hall", "1989-08-16", "(555) 100-0020", "jessica.hall@email.com", None),
    ]
    patient_ids = []
    for first, last, dob, phone, email, uid in patient_data:
        cur.execute("INSERT INTO patients (first_name, last_name, date_of_birth, phone, email, user_id, practice_id) VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                    (first, last, dob, phone, email, uid, practice_id))
        patient_ids.append(cur.fetchone()["id"])

    random.seed(42)
    sites = ['DB', 'B', 'MB', 'DL', 'L', 'ML']
    visit_types = ['perio_maintenance', 'prophy', 'srp', 'comprehensive_exam']
    note_types = ['perio_maintenance', 'prophy', 'srp', 'general']

    for pi, pid in enumerate(patient_ids):
        num_visits = random.randint(2, 4)
        condition = pi % 4
        base_depths = {0: (1, 3), 1: (2, 4), 2: (3, 5), 3: (4, 7)}[condition]

        for vi in range(num_visits):
            days_ago = int(180 - (vi * 180 / num_visits))
            visit_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
            provider = random.choice([hygienist_id, hygienist2_id])
            vtype = random.choice(visit_types)

            cur.execute("INSERT INTO visits (patient_id, provider_id, visit_date, visit_type) VALUES (%s,%s,%s,%s) RETURNING id",
                        (pid, provider, visit_date, vtype))
            visit_id = cur.fetchone()["id"]

            cur.execute("INSERT INTO perio_charts (visit_id, provider_id) VALUES (%s,%s) RETURNING id", (visit_id, provider))
            chart_id = cur.fetchone()["id"]

            improvement = vi * 0.3 if condition > 0 and pi % 3 == 0 else 0

            reading_vals = []
            reading_params = []
            for tooth in range(1, 33):
                for site in sites:
                    lo, hi = base_depths
                    depth = max(1, random.randint(lo, hi) - int(improvement))
                    recession = random.randint(0, 1) if condition >= 2 else 0
                    bop = random.random() < (0.1 + condition * 0.15)
                    reading_vals.append("(%s,%s,%s,%s,%s,%s,%s)")
                    reading_params.extend([chart_id, tooth, site, depth, recession, bop, False])
            cur.execute("INSERT INTO perio_readings (chart_id, tooth_number, site, pocket_depth, recession, bleeding_on_probing, suppuration) VALUES " + ",".join(reading_vals), reading_params)

            finding_vals = []
            finding_params = []
            for tooth in range(1, 33):
                mob = random.randint(0, min(condition, 2)) if random.random() < 0.1 else 0
                furc = random.randint(0, min(condition, 2)) if random.random() < 0.05 and tooth in [2,3,14,15,18,19,30,31] else 0
                finding_vals.append("(%s,%s,%s,%s,%s,%s)")
                finding_params.extend([visit_id, tooth, mob, furc, False, False])
            cur.execute("INSERT INTO tooth_findings (visit_id, tooth_number, mobility, furcation, missing, implant) VALUES " + ",".join(finding_vals), finding_params)

            note_content = {
                'perio_maintenance': f"Perio maintenance visit. Patient reports {'no concerns' if condition < 2 else 'some sensitivity in posterior teeth'}. Full mouth probing completed. {'Pockets within normal limits.' if condition == 0 else 'Elevated pocket depths noted in posterior regions.'} OHI reinforced.",
                'prophy': f"Adult prophylaxis completed. {'Light' if condition == 0 else 'Moderate to heavy'} calculus noted {'supragingivally' if condition < 2 else 'both supra and subgingivally'}. Polished with fine prophy paste.",
                'srp': f"SRP performed on {'upper right quadrant' if vi % 4 == 0 else 'lower left quadrant'}. Local anesthesia administered. Moderate subgingival calculus debrided. Post-op instructions given.",
                'general': f"Comprehensive periodontal evaluation. {'Healthy periodontium' if condition == 0 else 'Generalized ' + ['', 'gingivitis', 'mild periodontitis', 'moderate periodontitis'][condition]} noted. Treatment plan discussed.",
            }[random.choice(note_types)]

            cur.execute("INSERT INTO clinical_notes (patient_id, visit_id, author_id, note_type, content, created_at) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                        (pid, visit_id, provider, vtype, note_content, visit_date + " 10:00:00"))
            note_id = cur.fetchone()["id"]
            cur.execute("INSERT INTO note_versions (note_id, version_number, content, editor_id, change_summary, created_at) VALUES (%s,1,%s,%s,'Initial version',%s)",
                        (note_id, note_content, provider, visit_date + " 10:00:00"))

            if vi == 0 and pi < 5:
                addendum = random.choice(["cold sensitivity on #19.", "bleeding when flossing in upper right.", "jaw pain in the morning, possible bruxism.", "dry mouth symptoms.", "recent change in medication (blood pressure)."])
                edit_content = note_content + "\n\nAddendum: Patient also reported " + addendum
                cur.execute("INSERT INTO note_versions (note_id, version_number, content, editor_id, change_summary, created_at) VALUES (%s,2,%s,%s,'Added patient-reported findings',%s)",
                            (note_id, edit_content, provider, visit_date + " 10:30:00"))
                cur.execute("UPDATE clinical_notes SET content = %s WHERE id = %s", (edit_content, note_id))

    treatment_data = [
        (patient_ids[2], dentist_id, "SRP - Full Mouth", "proposed", [(None, "SRP - UR", "D4341", 250), (None, "SRP - UL", "D4341", 250), (None, "SRP - LR", "D4341", 250), (None, "SRP - LL", "D4341", 250)]),
        (patient_ids[3], dentist_id, "Crown and Perio Treatment", "accepted", [(19, "PFM Crown", "D2750", 1200), (19, "Core Buildup", "D2950", 350), (None, "SRP - Lower Right", "D4341", 250)]),
        (patient_ids[0], dentist_id, "Periodontal Maintenance Plan", "in_progress", [(None, "Perio Maintenance", "D4910", 175), (None, "Fluoride Treatment", "D1208", 35)]),
        (patient_ids[6], dentist_id, "Full Mouth Restoration", "proposed", [(14, "PFM Crown", "D2750", 1200), (15, "PFM Crown", "D2750", 1200), (18, "Implant", "D6010", 3500), (19, "Implant Crown", "D6065", 1800)]),
        (patient_ids[1], dentist_id, "Whitening and Prophy", "completed", [(None, "Adult Prophy", "D1110", 125), (None, "In-office Whitening", "D9972", 500)]),
    ]
    for pid, prov_id, title, status, items in treatment_data:
        cur.execute("INSERT INTO treatment_plans (patient_id, provider_id, title, status, notes) VALUES (%s,%s,%s,%s,'') RETURNING id", (pid, prov_id, title, status))
        plan_id = cur.fetchone()["id"]
        for tooth, proc, cdt, fee in items:
            cur.execute("INSERT INTO treatment_items (plan_id, tooth_number, procedure_name, cdt_code, fee, status) VALUES (%s,%s,%s,%s,%s,%s)",
                        (plan_id, tooth, proc, cdt, fee, status))
