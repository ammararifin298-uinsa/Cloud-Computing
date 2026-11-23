import React, { useEffect, useState } from "react";
import BarcodeScanner from "../components/BarcodeScanner.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  ALLOWED_TRANSITIONS, PROOF_REQUIRED_STATUSES, STATUS_LABEL, apiFetch, generateIdempotencyKey,
} from "../lib/api.js";

export default function CheckpointPage() {
  const { showToast } = useAuth();
  const [hubs, setHubs] = useState([]);
  const [scanner, setScanner] = useState(false);
  const [code, setCode] = useState("");
  const [ship, setShip] = useState(null);
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const [hubId, setHubId] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(generateIdempotencyKey);

  useEffect(() => {
    apiFetch("/api/reference").then((d) => setHubs(d.hubs || [])).catch(() => {});
  }, []);

  const lookup = async (c) => {
    const clean = String(c || code).trim().toUpperCase();
    if (!clean) return;
    setCode(clean);
    setError("");
    setShip(null);
    try {
      const r = await apiFetch(`/api/shipments/${encodeURIComponent(clean)}/events`);
      setShip(r.shipment);
      setStatus((ALLOWED_TRANSITIONS[r.shipment.current_status] || [])[0] || "");
      setIdem(generateIdempotencyKey());
    } catch (e) {
      setError(e.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let proof = null;
      if (photo) {
        const fd = new FormData();
        fd.append("shipment_code", ship.code);
        fd.append("file", photo);
        const up = await apiFetch("/api/uploads", { method: "POST", body: fd, isFormData: true });
        proof = up.object_key;
      }
      const ev = await apiFetch("/api/events", {
        method: "POST",
        idempotencyKey: idem,
        body: {
          shipment_code: ship.code, status, location: location.trim(),
          hub_id: hubId ? Number(hubId) : null, expected_version: ship.version,
          notes: notes.trim() || null, proof_object_key: proof,
        },
      });
      showToast(`Status ${ev.shipment_code}: ${STATUS_LABEL[ev.status]}`, "success");
      setNotes("");
      setPhoto(null);
      await lookup(ship.code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const next = ship ? ALLOWED_TRANSITIONS[ship.current_status] || [] : [];
  const off = !ship || next.length === 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Input Checkpoint</h1>
          <p className="page-sub">Perbarui status paket sesuai alur yang diizinkan.</p>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card-box">
          <div className="form-group">
            <label>Nomor Resi</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-control mono" value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookup())} />
              <button type="button" className="btn-primary" onClick={() => lookup()}>Cek</button>
            </div>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setScanner(true)}>Pindai Barcode</button>
          {ship && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--surface-2)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong className="mono">{ship.code}</strong><StatusBadge status={ship.current_status} />
              </div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Lokasi: {ship.current_location}</div>
              {next.length === 0 && <div style={{ color: "#b91c1c", fontWeight: 700, marginTop: 6 }}>Status final, tidak dapat diubah.</div>}
            </div>
          )}
        </div>

        <form className="card-box" onSubmit={submit}>
          <div className="form-group"><label>Status Berikutnya</label>
            <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)} disabled={off} required>
              <option value="">-- Pilih --</option>
              {next.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select></div>
          <div className="form-group"><label>Hub (opsional)</label>
            <select className="form-control" value={hubId} disabled={off}
              onChange={(e) => {
                setHubId(e.target.value);
                const h = hubs.find((x) => String(x.id) === e.target.value);
                if (h) setLocation(h.name);
              }}>
              <option value="">-- Manual --</option>
              {hubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select></div>
          <div className="form-group"><label>Lokasi</label>
            <input className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} disabled={off} required /></div>
          <div className="form-group"><label>Catatan</label>
            <input className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={off} /></div>
          <div className="form-group">
            <label>Foto Bukti {PROOF_REQUIRED_STATUSES.has(status) ? "(disarankan)" : "(opsional)"}</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
              className="form-control" disabled={off} onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>
          {error && <div className="degraded-banner" role="alert">{error}</div>}
          <button className="btn-primary" style={{ width: "100%" }} disabled={busy || off}>
            {busy ? "Menyimpan..." : "Simpan Checkpoint"}
          </button>
        </form>
      </div>
      {scanner && <BarcodeScanner onDetected={(v) => lookup(v)} onClose={() => setScanner(false)} />}
    </div>
  );
}
