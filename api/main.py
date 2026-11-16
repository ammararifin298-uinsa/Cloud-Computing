import base64
import hashlib
import hmac
import json
import os
import secrets
import socket
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from pydantic import BaseModel, Field

DSN = os.getenv("DATABASE_URL", "postgresql://logistik:logistik@localhost:5432/logistik")
BACKUP_DIR = Path(os.getenv("BACKUP_DIR", "/backups"))
BACKUP_INTERVAL = int(os.getenv("BACKUP_INTERVAL", "900"))
S3_BUCKET = os.getenv("S3_BUCKET", "lacakin-backups")
NODE_NAME = os.getenv("APP_NODE", socket.gethostname())
JWT_SECRET = os.getenv("JWT_SECRET", "logistikpro-dev-secret-change-in-prod")
JWT_TTL_SECONDS = int(os.getenv("JWT_TTL_SECONDS", "43200"))
STATIC_DIR = Path(__file__).parent / "static"

pool = ConnectionPool(
    DSN,
    min_size=1,
    max_size=10,
    open=False,
    check=ConnectionPool.check_connection,
    kwargs={"row_factory": dict_row},
)

Status = Literal["DITERIMA", "DISIMPAN", "DALAM_PERJALANAN", "DIKIRIM", "SELESAI"]
Role = Literal["superadmin", "admin", "supervisor", "operator", "kurir"]
RegisterRole = Literal["kurir", "operator", "supervisor"]
KURIR_ALLOWED_STATUSES = {"DALAM_PERJALANAN", "DIKIRIM", "SELESAI"}

ROLE_PREFIX = {
    "superadmin": "SUP",
    "admin": "ADM",
    "supervisor": "SPV",
    "operator": "OPR",
    "kurir": "KUR",
}

ROLE_SEQUENCE = {
    "kurir": "emp_seq_kur",
    "operator": "emp_seq_opr",
    "supervisor": "emp_seq_spv",
}


# ---------- Password Hashing (PBKDF2-HMAC-SHA256) & JWT (HS256) ----------

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256$120000${salt}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        alg, iters, salt, digest_hex = stored_hash.split("$", 3)
        if alg != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iters))
        return hmac.compare_digest(dk.hex(), digest_hex)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + pad)


def create_jwt(user: dict) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload_data = {
        "sub": str(user["id"]),
        "employee_code": user["employee_code"],
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
        "station": user.get("station") or "",
        "exp": int(time.time()) + JWT_TTL_SECONDS,
    }
    payload = _b64url_encode(json.dumps(payload_data, separators=(",", ":")).encode())
    signing_input = f"{header}.{payload}".encode("ascii")
    sig = _b64url_encode(hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def decode_jwt(token: str) -> dict:
    try:
        header_b64, payload_b64, sig_b64 = token.split(".", 2)
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = _b64url_encode(
            hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        )
        if not hmac.compare_digest(sig_b64, expected_sig):
            raise ValueError("Invalid signature")
        payload = json.loads(_b64url_decode(payload_b64))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("Token expired")
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Sesi tidak valid atau sudah kedaluwarsa")


def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Autentikasi diperlukan")
    payload = decode_jwt(authorization.split(" ", 1)[1].strip())
    with pool.connection(timeout=5) as conn:
        row = conn.execute("SELECT is_active, role, station FROM users WHERE id = %s", (int(payload["sub"]),)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Akun pegawai tidak ditemukan")
    if not row["is_active"]:
        raise HTTPException(status_code=403, detail="Akun Anda sedang dinonaktifkan oleh Admin atau Superadmin")
    payload["role"] = row["role"]
    payload["station"] = row["station"] or ""
    return payload


def require_roles(*allowed_roles: str):
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Akses ditolak: fitur ini khusus role {', '.join(allowed_roles)}",
            )
        return user
    return checker


def _ensure_users_seeded():
    with pool.connection(timeout=10) as conn:
        conn.execute("SELECT pg_advisory_lock(987654321)")
        try:
            conn.execute(
                """CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    employee_code TEXT UNIQUE NOT NULL,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    nik TEXT UNIQUE,
                    phone TEXT,
                    email TEXT,
                    station TEXT,
                    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'supervisor', 'operator', 'kurir')),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )"""
            )
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code TEXT")
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS nik TEXT")
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT")
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT")
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS station TEXT")
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT")
            conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE")
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nik ON users (nik)")
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_code ON users (employee_code)")
            conn.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check")
            conn.execute(
                """ALTER TABLE users ADD CONSTRAINT users_role_check
                   CHECK (role IN ('superadmin', 'admin', 'supervisor', 'operator', 'kurir'))"""
            )

            # Backfill missing employee_code on legacy rows if any
            legacy = conn.execute("SELECT id, role FROM users WHERE employee_code IS NULL").fetchall()
            for row in legacy:
                prefix = ROLE_PREFIX.get(row["role"], "EMP")
                conn.execute(
                    "UPDATE users SET employee_code = %s WHERE id = %s",
                    (f"{prefix}-{row['id']:04d}", row["id"]),
                )
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_code ON users (employee_code)")

            count = conn.execute("SELECT count(*) AS c FROM users").fetchone()["c"]
            if count == 0:
                defaults = [
                    ("SUP-0001", "superadmin", "super123", "Superadmin Infrastruktur", "3578010101900001", "081100000001", "superadmin@lacakin.id", "Pusat Infrastruktur DC", "superadmin"),
                    ("ADM-0001", "admin", "admin123", "Admin Operasional", "3578010101920002", "081100000002", "admin@lacakin.id", "DC Cakung, Jakarta Timur", "admin"),
                    ("SPV-0001", "supervisor", "spv123", "Supervisor Monitoring", "3578010101930003", "081100000003", "supervisor@lacakin.id", "DC Rungkut, Surabaya", "supervisor"),
                    ("OPR-0001", "operator", "op123", "Operator Gudang", "3578010101940004", "081100000004", "operator@lacakin.id", "DC Cakung, Jakarta Timur", "operator"),
                    ("KUR-0001", "kurir", "kurir123", "Kurir Lapangan", "3578010101950005", "081100000005", "kurir@lacakin.id", "Hub Kurir Last-Mile", "kurir"),
                ]
                for emp_code, uname, pwd, fname, nik, phone, email, station, role in defaults:
                    conn.execute(
                        """INSERT INTO users (employee_code, username, password_hash, full_name, nik, phone, email, station, role)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (username) DO NOTHING""",
                        (emp_code, uname, hash_password(pwd), fname, nik, phone, email, station, role),
                    )

            for role_name, seq_name in ROLE_SEQUENCE.items():
                conn.execute(f"CREATE SEQUENCE IF NOT EXISTS {seq_name} START WITH 1")
                role_count = conn.execute("SELECT count(*) AS c FROM users WHERE role = %s", (role_name,)).fetchone()["c"]
                conn.execute("SELECT setval(%s, %s, true)", (seq_name, max(role_count, 1)))

            conn.execute(
                """CREATE TABLE IF NOT EXISTS system_settings (
                    key TEXT PRIMARY KEY,
                    enabled BOOLEAN NOT NULL DEFAULT TRUE,
                    label TEXT NOT NULL,
                    description TEXT NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )"""
            )
            default_settings = [
                ("public_tracking", True, "Layanan Lacak Publik", "Mengizinkan pelanggan melacak nomor resi pada halaman /lacak tanpa login."),
                ("self_register", True, "Pendaftaran Pegawai Mandiri", "Mengizinkan pendaftaran akun pegawai baru melalui halaman /register."),
                ("checkpoint_write", True, "Input Checkpoint Operasional", "Mengaktifkan pencatatan paket baru dan update checkpoint. Nonaktifkan untuk mode baca-saja saat pemeliharaan."),
            ]
            for s_key, s_enabled, s_label, s_desc in default_settings:
                conn.execute(
                    """INSERT INTO system_settings (key, enabled, label, description)
                       VALUES (%s, %s, %s, %s) ON CONFLICT (key) DO NOTHING""",
                    (s_key, s_enabled, s_label, s_desc),
                )
        finally:
            conn.execute("SELECT pg_advisory_unlock(987654321)")


def _is_feature_enabled(conn, key: str) -> bool:
    row = conn.execute("SELECT enabled FROM system_settings WHERE key = %s", (key,)).fetchone()
    return True if row is None else bool(row["enabled"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open(wait=False)
    try:
        _ensure_users_seeded()
    except Exception as exc:
        print(f"[startup] _ensure_users_seeded error: {exc}", flush=True)
    yield
    pool.close()


app = FastAPI(title="LacakIn - Sistem Tracking dan Rantai Pasok", lifespan=lifespan)


@app.middleware("http")
async def add_node_header(request, call_next):
    response = await call_next(request)
    response.headers["X-App-Node"] = NODE_NAME
    return response


class EventIn(BaseModel):
    shipment_code: str = Field(min_length=3, max_length=50)
    status: Status
    location: str = Field(min_length=2, max_length=100)


class LoginIn(BaseModel):
    identifier: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=100)


class RegisterIn(BaseModel):
    role: RegisterRole
    full_name: str = Field(min_length=3, max_length=80)
    nik: str = Field(pattern=r"^\d{16}$")
    phone: str = Field(pattern=r"^(\+62|62|0)8\d{7,12}$")
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=100)
    station: str = Field(min_length=2, max_length=100)
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=6, max_length=100)


class UserUpdateIn(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[Role] = None
    station: Optional[str] = Field(default=None, min_length=2, max_length=100)


class SettingUpdateIn(BaseModel):
    enabled: bool


# ---------- Auth ----------

@app.post("/api/auth/login")
def login(body: LoginIn):
    ident = body.identifier.strip()
    with pool.connection(timeout=5) as conn:
        user = conn.execute(
            """SELECT id, employee_code, username, password_hash, full_name, nik, phone, email, station, role, is_active, avatar_url, created_at
               FROM users
               WHERE nik = %s
                  OR upper(employee_code) = %s
                  OR lower(username) = %s""",
            (ident, ident.upper(), ident.lower()),
        ).fetchone()
        if not user:
            all_hashes = conn.execute("SELECT password_hash FROM users").fetchall()
            pass_matches_someone = any(verify_password(body.password, r["password_hash"]) for r in all_hashes)
            if not pass_matches_someone:
                raise HTTPException(
                    status_code=401,
                    detail="NIP / NIK / Username tidak ditemukan dan Kata Sandi salah.",
                )
            raise HTTPException(
                status_code=401,
                detail="NIP / NIK / Username tidak ditemukan. Periksa kembali identitas Anda.",
            )
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Kata sandi salah. Periksa kembali kata sandi Anda.",
        )
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="Akun pegawai Anda sedang dinonaktifkan. Hubungi Admin atau Superadmin.")
    token = create_jwt(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "employee_code": user["employee_code"],
            "username": user["username"],
            "full_name": user["full_name"],
            "nik": user["nik"],
            "phone": user["phone"],
            "email": user["email"],
            "station": user["station"],
            "role": user["role"],
            "avatar_url": user.get("avatar_url"),
            "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
        },
    }


@app.post("/api/auth/register", status_code=201)
def register(body: RegisterIn):
    uname = body.username.strip().lower()
    email = body.email.strip().lower()
    seq_name = ROLE_SEQUENCE[body.role]
    prefix = ROLE_PREFIX[body.role]

    with pool.connection(timeout=5) as conn:
        if not _is_feature_enabled(conn, "self_register"):
            raise HTTPException(status_code=403, detail="Pendaftaran pegawai mandiri sedang dinonaktifkan oleh Superadmin.")
        if conn.execute("SELECT 1 FROM users WHERE lower(username) = %s", (uname,)).fetchone():
            raise HTTPException(status_code=409, detail="Username sudah digunakan")
        if conn.execute("SELECT 1 FROM users WHERE nik = %s", (body.nik,)).fetchone():
            raise HTTPException(status_code=409, detail="NIK sudah terdaftar")
        if conn.execute("SELECT 1 FROM users WHERE lower(email) = %s", (email,)).fetchone():
            raise HTTPException(status_code=409, detail="Email sudah terdaftar")

        seq_num = conn.execute(f"SELECT nextval('{seq_name}') AS n").fetchone()["n"]
        emp_code = f"{prefix}-{seq_num:04d}"

        row = conn.execute(
            """INSERT INTO users (employee_code, username, password_hash, full_name, nik, phone, email, station, role)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
               RETURNING id, employee_code, username, full_name, phone, email, station, role""",
            (
                emp_code,
                uname,
                hash_password(body.password),
                body.full_name.strip(),
                body.nik,
                body.phone.strip(),
                email,
                body.station.strip(),
                body.role,
            ),
        ).fetchone()
    token = create_jwt(row)
    return {"access_token": token, "token_type": "bearer", "user": row}


class SelfProfileUpdateIn(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=3, max_length=80)
    username: Optional[str] = Field(default=None, min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_.-]+$")
    phone: Optional[str] = Field(default=None, pattern=r"^(\+62|62|0)8\d{7,12}$")
    email: Optional[str] = Field(default=None, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=100)
    station: Optional[str] = Field(default=None, min_length=2, max_length=100)
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=6, max_length=100)
    avatar_base64: Optional[str] = None
    avatar_content_type: Optional[str] = Field(default="image/png", max_length=60)
    remove_avatar: Optional[bool] = False


@app.get("/api/auth/me")
def auth_me(user: dict = Depends(get_current_user)):
    uid = int(user["sub"])
    with pool.connection(timeout=5) as conn:
        row = conn.execute(
            """SELECT id, employee_code, username, full_name, nik, phone, email, station, role, is_active, avatar_url, created_at
               FROM users WHERE id = %s""",
            (uid,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Akun pengguna tidak ditemukan")
    return row


@app.patch("/api/auth/me")
def update_auth_me(body: SelfProfileUpdateIn, user: dict = Depends(get_current_user)):
    uid = int(user["sub"])
    with pool.connection(timeout=5) as conn:
        cur = conn.execute(
            """SELECT id, employee_code, username, password_hash, full_name, nik, phone, email, station, role, is_active, avatar_url, created_at
               FROM users WHERE id = %s""",
            (uid,),
        ).fetchone()
        if not cur:
            raise HTTPException(status_code=404, detail="Akun tidak ditemukan")

        new_uname = body.username.strip().lower() if body.username else cur["username"]
        new_email = body.email.strip().lower() if body.email else cur["email"]
        new_fname = body.full_name.strip() if body.full_name else cur["full_name"]
        new_phone = body.phone.strip() if body.phone else cur["phone"]
        new_station = body.station.strip() if body.station else cur["station"]
        new_hash = cur["password_hash"]
        new_avatar = cur.get("avatar_url")

        if new_uname != cur["username"].lower():
            if conn.execute("SELECT 1 FROM users WHERE lower(username) = %s AND id != %s", (new_uname, uid)).fetchone():
                raise HTTPException(status_code=409, detail="Username sudah digunakan oleh pegawai lain")

        if new_email and (not cur["email"] or new_email != cur["email"].lower()):
            if conn.execute("SELECT 1 FROM users WHERE lower(email) = %s AND id != %s", (new_email, uid)).fetchone():
                raise HTTPException(status_code=409, detail="Email sudah digunakan oleh pegawai lain")

        if body.new_password:
            if not body.current_password or not verify_password(body.current_password, cur["password_hash"]):
                raise HTTPException(status_code=400, detail="Kata sandi saat ini tidak sesuai")
            new_hash = hash_password(body.new_password)

        if body.remove_avatar:
            new_avatar = None
        elif body.avatar_base64:
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            ext = "png"
            if body.avatar_content_type and "jpeg" in body.avatar_content_type:
                ext = "jpg"
            elif body.avatar_content_type and "svg" in body.avatar_content_type:
                ext = "svg"
            fname = f"avatar_{cur['employee_code']}_{int(time.time())}.{ext}"
            raw = base64.b64decode(body.avatar_base64)
            (UPLOADS_DIR / fname).write_bytes(raw)
            new_avatar = f"/uploads/{fname}"

        updated = conn.execute(
            """UPDATE users
               SET full_name = %s, username = %s, phone = %s, email = %s, station = %s, password_hash = %s, avatar_url = %s
               WHERE id = %s
               RETURNING id, employee_code, username, full_name, nik, phone, email, station, role, is_active, avatar_url, created_at""",
            (new_fname, new_uname, new_phone, new_email, new_station, new_hash, new_avatar, uid),
        ).fetchone()

    token = create_jwt(updated)
    return {"access_token": token, "token_type": "bearer", "user": updated}


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
def add_event(e: EventIn, authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        user = decode_jwt(authorization.split(" ", 1)[1].strip())
        role = user.get("role")
        if role == "supervisor":
            raise HTTPException(status_code=403, detail="Role supervisor hanya memiliki akses pantau (read-only)")
        if role == "kurir" and e.status not in KURIR_ALLOWED_STATUSES:
            raise HTTPException(
                status_code=403,
                detail="Role kurir hanya dapat mencatat status DALAM_PERJALANAN, DIKIRIM, atau SELESAI",
            )
    with pool.connection(timeout=5) as conn:
        if not _is_feature_enabled(conn, "checkpoint_write"):
            raise HTTPException(status_code=503, detail="Input checkpoint sedang dinonaktifkan sementara (Mode Pemeliharaan).")
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
def shipment_events(code: str, authorization: Optional[str] = Header(default=None)):
    with pool.connection(timeout=5) as conn:
        if not (authorization and authorization.startswith("Bearer ")):
            if not _is_feature_enabled(conn, "public_tracking"):
                raise HTTPException(status_code=503, detail="Layanan pelacakan publik sedang dinonaktifkan sementara.")
        rows = conn.execute(
            """SELECT id, status, location, recorded_at FROM tracking_events
               WHERE shipment_code = %s ORDER BY recorded_at DESC LIMIT 100""",
            (code,),
        ).fetchall()
    if not rows:
        raise HTTPException(404, "Shipment tidak ditemukan")
    return rows


@app.delete("/api/shipments/{code}")
def delete_shipment(code: str, _user: dict = Depends(require_roles("admin", "superadmin"))):
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


# ---------- Backup (Superadmin Only, read-only dari /backups) ----------

@app.get("/api/backups")
def list_backups(_user: dict = Depends(require_roles("superadmin"))):
    files = []
    if BACKUP_DIR.is_dir():
        for f in BACKUP_DIR.glob("logistik_*.dump"):
            st = f.stat()
            sha_path = BACKUP_DIR / f"{f.name}.sha256"
            sha256 = ""
            if sha_path.is_file():
                sha256 = sha_path.read_text(encoding="utf-8").strip().split()[0]
            files.append({
                "name": f.name,
                "size_bytes": st.st_size,
                "sha256": sha256,
                "created_at": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
            })
    files.sort(key=lambda x: x["created_at"], reverse=True)

    cloud_s3 = {"synced": False, "bucket": S3_BUCKET, "last_object": None, "synced_at": None}
    s3_status_file = BACKUP_DIR / ".s3_sync_status.json"
    if s3_status_file.is_file():
        try:
            cloud_s3 = json.loads(s3_status_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    db_cluster = {"role": "Primary (Read-Write)", "standby_count": 0}
    try:
        with pool.connection(timeout=3) as conn:
            in_rec = conn.execute("SELECT pg_is_in_recovery() AS r").fetchone()["r"]
            replicas = conn.execute("SELECT count(*) AS c FROM pg_stat_replication").fetchone()["c"]
            db_cluster = {
                "role": "Standby" if in_rec else "Primary (Read-Write)",
                "standby_count": int(replicas),
            }
    except Exception:
        pass

    return {
        "app_node": NODE_NAME,
        "interval_seconds": BACKUP_INTERVAL,
        "retention_hours": 24,
        "cloud_s3": cloud_s3,
        "db_cluster": db_cluster,
        "files": files,
    }


# ---------- Manajemen Pegawai & Kontrol Fitur ----------

@app.get("/api/users")
def list_users(_user: dict = Depends(require_roles("admin", "superadmin"))):
    with pool.connection(timeout=5) as conn:
        return conn.execute(
            """SELECT id, employee_code, username, full_name, nik, phone, email, station, role, is_active, created_at
               FROM users
               ORDER BY id ASC"""
        ).fetchall()


@app.patch("/api/users/{user_id}")
def update_user(user_id: int, body: UserUpdateIn, current: dict = Depends(require_roles("admin", "superadmin"))):
    actor_id = int(current["sub"])
    actor_role = current["role"]
    with pool.connection(timeout=5) as conn:
        target = conn.execute("SELECT id, role, is_active, station FROM users WHERE id = %s", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Pegawai tidak ditemukan")
        if target["id"] == actor_id and body.is_active is False:
            raise HTTPException(status_code=400, detail="Anda tidak dapat menonaktifkan akun Anda sendiri")
        if actor_role == "admin":
            if target["role"] == "superadmin":
                raise HTTPException(status_code=403, detail="Admin tidak dapat mengubah akun Superadmin")
            if body.role == "superadmin":
                raise HTTPException(status_code=403, detail="Admin tidak dapat menaikkan jabatan ke Superadmin")

        new_active = target["is_active"] if body.is_active is None else body.is_active
        new_role = target["role"] if body.role is None else body.role
        new_station = target["station"] if body.station is None else body.station.strip()
        updated = conn.execute(
            """UPDATE users
               SET is_active = %s, role = %s, station = %s
               WHERE id = %s
               RETURNING id, employee_code, username, full_name, nik, phone, email, station, role, is_active, created_at""",
            (new_active, new_role, new_station, user_id),
        ).fetchone()
    return updated


@app.get("/api/settings/public")
def public_settings():
    with pool.connection(timeout=5) as conn:
        rows = conn.execute("SELECT key, enabled FROM system_settings").fetchall()
    return {r["key"]: r["enabled"] for r in rows}


@app.get("/api/settings")
def list_settings(_user: dict = Depends(require_roles("superadmin"))):
    with pool.connection(timeout=5) as conn:
        return conn.execute(
            "SELECT key, enabled, label, description, updated_at FROM system_settings ORDER BY key ASC"
        ).fetchall()


@app.patch("/api/settings/{key}")
def update_setting(key: str, body: SettingUpdateIn, _user: dict = Depends(require_roles("superadmin"))):
    with pool.connection(timeout=5) as conn:
        row = conn.execute(
            """UPDATE system_settings
               SET enabled = %s, updated_at = now()
               WHERE key = %s
               RETURNING key, enabled, label, description, updated_at""",
            (body.enabled, key),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Pengaturan fitur tidak ditemukan")
    return row


# ---------- CDN & File Storage (Nginx Edge CDN + Shared Storage Volume) ----------

UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", "/cdn-uploads"))
CDN_PUBLIC_URL = os.getenv("CDN_PUBLIC_URL", "http://localhost:8080").rstrip("/")
SERVE_STATIC = os.getenv("SERVE_STATIC", "1") == "1"


class UploadAssetIn(BaseModel):
    shipment_code: str = Field(..., min_length=2, max_length=64)
    filename: str = Field(..., min_length=1, max_length=120)
    content_type: str = Field(default="image/svg+xml", max_length=80)
    content_base64: str = Field(..., min_length=4)


@app.post("/api/uploads", status_code=201)
def upload_asset_to_cdn(body: UploadAssetIn):
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = "".join(c for c in body.filename if c.isalnum() or c in ("-", "_", ".")).strip(".") or "asset.bin"
    safe_code = "".join(c for c in body.shipment_code if c.isalnum() or c in ("-", "_"))
    object_key = f"{safe_code}_{safe_name}"
    raw_bytes = base64.b64decode(body.content_base64)
    target = UPLOADS_DIR / object_key
    target.write_bytes(raw_bytes)
    return {
        "status": "uploaded",
        "key": object_key,
        "size_bytes": len(raw_bytes),
        "content_type": body.content_type,
        "cdn_url": f"{CDN_PUBLIC_URL}/uploads/{object_key}",
        "lb_url": f"/uploads/{object_key}",
        "served_by": "lacakin-cdn (Nginx Edge CDN & File Storage)",
    }


@app.get("/api/uploads")
def list_cdn_assets():
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for f in sorted(UPLOADS_DIR.iterdir()):
        if f.is_file() and not f.name.startswith("avatar_"):
            st = f.stat()
            items.append({
                "key": f.name,
                "size_bytes": st.st_size,
                "last_modified": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
                "cdn_url": f"{CDN_PUBLIC_URL}/uploads/{f.name}",
                "lb_url": f"/uploads/{f.name}",
            })
    return {"cdn_base": CDN_PUBLIC_URL, "count": len(items), "items": items}


@app.delete("/api/uploads/{key}")
def delete_cdn_asset(key: str):
    safe_key = "".join(c for c in key if c.isalnum() or c in ("-", "_", ".")).strip(".")
    target = UPLOADS_DIR / safe_key
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File bukti tidak ditemukan")
    target.unlink()
    return {"status": "deleted", "key": safe_key}


# ---------- Halaman (Dinonaktifkan di App Server jika SERVE_STATIC=0 / Dilayani oleh CDN) ----------

PAGES = {
    "/": "index.html",
    "/checkpoint": "checkpoint.html",
    "/pengiriman": "pengiriman.html",
    "/lacak": "lacak.html",
    "/pegawai": "pegawai.html",
    "/backup": "backup.html",
    "/login": "login.html",
    "/register": "register.html",
}


def _page_route(filename: str):
    def handler():
        return FileResponse(STATIC_DIR / filename)
    return handler


if SERVE_STATIC:
    for path, filename in PAGES.items():
        app.add_api_route(path, _page_route(filename), methods=["GET"], include_in_schema=False)
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
