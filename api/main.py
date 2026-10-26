import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from pydantic import BaseModel, Field

DSN = os.getenv("DATABASE_URL", "postgresql://logistik:logistik@localhost:5432/logistik")
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "/backups"))
BACKUP_INTERVAL = int(os.getenv("BACKUP_INTERVAL", "900"))
STATIC_DIR = Path(__file__).parent / "static"

pool = ConnectionPool(DSN, min_size=1, max_size=10, open=False,
                      kwargs={"row_factory": dict_row})


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open(wait=False)
    yield
    pool.close()


app = FastAPI(title="Dashboard Logistik dan Rantai Pasok", lifespan=lifespan)

Status = Literal["DITERIMA", "DISIMPAN", "DALAM_PERJALANAN", "DIKIRIM", "SELESAI"]


class EventIn(BaseModel):
    shipment_code: str = Field(min_length=3, max_length=50)
    status: Status
    location: str = Field(min_length=2, max_length=100)


# ---------- Health ----------

@app.get("/health")
def health():
    try:
        with pool.connection(timeout=3) as conn:
            conn.execute("SELECT 1")
        return {"status": "ok", "database": "up"}
    except Exception:
        raise HTTPException(status_code=503, detail="database down")


# ---------- Tracking events ----------

@app.post("/api/events", status_code=201)
def add_event(e: EventIn):
    with pool.connection(timeout=5) as conn:
        conn.execute(
            """INSERT INTO shipments (code, current_status, current_location)
               VALUES (%s, %s, %s)
               ON CONFLICT (code) DO UPDATE
               SET current_status = EXCLUDED.current_status,
                   current_location = EXCLUDED.current_location,
                   updated_at = now()""",
            (e.shipment_code, e.status, e.location),
        )
        row = conn.execute(
            """INSERT INTO tracking_events (shipment_code, status, location)
               VALUES (%s, %s, %s) RETURNING id, recorded_at""",
            (e.shipment_code, e.status, e.location),
        ).fetchone()
    return row


# ---------- Shipments ----------

@app.get("/api/shipments")
def list_shipments():
    with pool.connection(timeout=5) as conn:
        return conn.execute(
            """SELECT s.code, s.current_status, s.current_location, s.updated_at,
                      count(t.id) AS total_events
               FROM shipments s
               LEFT JOIN tracking_events t ON t.shipment_code = s.code
               GROUP BY s.code
               ORDER BY s.updated_at DESC
               LIMIT 500"""
        ).fetchall()


@app.get("/api/shipments/{code}/events")
def shipment_events(code: str):
    with pool.connection(timeout=5) as conn:
        rows = conn.execute(
            """SELECT id, status, location, recorded_at FROM tracking_events
               WHERE shipment_code = %s ORDER BY recorded_at DESC LIMIT 100""",
            (code,),
        ).fetchall()
    if not rows:
        raise HTTPException(404, "Shipment tidak ditemukan")
    return rows


@app.delete("/api/shipments/{code}")
def delete_shipment(code: str):
    # Satu transaksi: hapus riwayat event dulu (FK), lalu master pengiriman.
    with pool.connection(timeout=5) as conn:
        events = conn.execute(
            "DELETE FROM tracking_events WHERE shipment_code = %s", (code,)
        ).rowcount
        shipments = conn.execute(
            "DELETE FROM shipments WHERE code = %s", (code,)
        ).rowcount
    if not shipments:
        raise HTTPException(404, "Shipment tidak ditemukan")
    return {"deleted": code, "events_deleted": events}


# ---------- Dashboard ----------

@app.get("/api/dashboard")
def dashboard():
    with pool.connection(timeout=5) as conn:
        by_status = conn.execute(
            "SELECT current_status AS status, count(*) AS total FROM shipments GROUP BY 1 ORDER BY 2 DESC"
        ).fetchall()
        totals = conn.execute(
            """SELECT count(*) AS total_events,
                      count(*) FILTER (WHERE recorded_at > now() - interval '1 hour') AS events_last_hour
               FROM tracking_events"""
        ).fetchone()
        latest = conn.execute(
            """SELECT shipment_code, status, location, recorded_at
               FROM tracking_events ORDER BY recorded_at DESC LIMIT 10"""
        ).fetchall()
    return {"by_status": by_status, **totals, "latest": latest}


# ---------- Backup (read-only, tidak menyentuh database) ----------

@app.get("/api/backups")
def list_backups():
    files = []
    if BACKUP_DIR.is_dir():
        for f in BACKUP_DIR.glob("logistik_*.dump"):
            st = f.stat()
            files.append({
                "name": f.name,
                "size_bytes": st.st_size,
                "created_at": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
            })
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return {"interval_seconds": BACKUP_INTERVAL, "retention_hours": 24, "files": files}


# ---------- Halaman ----------

PAGES = {
    "/": "index.html",
    "/checkpoint": "checkpoint.html",
    "/pengiriman": "pengiriman.html",
    "/lacak": "lacak.html",
    "/backup": "backup.html",
}


def _page_route(filename: str):
    def handler():
        return FileResponse(STATIC_DIR / filename)
    return handler


for path, filename in PAGES.items():
    app.add_api_route(path, _page_route(filename), methods=["GET"], include_in_schema=False)


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
