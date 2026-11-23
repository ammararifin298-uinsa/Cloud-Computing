import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { apiFetch, formatRupiah, generateIdempotencyKey } from "../lib/api.js";

const EMPTY = {
  sender_name: "", sender_phone: "", sender_address: "", origin_city_id: "",
  receiver_name: "", receiver_phone: "", receiver_address: "", dest_city_id: "",
  service_code: "REG", weight_kg: "1", length_cm: "0", width_cm: "0", height_cm: "0",
  declared_value: "0", use_insurance: false, payment_status: "PAID", channel: "LOKET",
};

export default function KirimPage() {
  const { showToast } = useAuth();
  const [ref, setRef] = useState({ cities: [], services: [] });
  const [form, setForm] = useState(EMPTY);
  const [quote, setQuote] = useState(null);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(generateIdempotencyKey);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  useEffect(() => {
    apiFetch("/api/reference").then(setRef).catch((e) => setError(e.message));
  }, []);

  const body = () => ({
    ...form,
    origin_city_id: Number(form.origin_city_id),
    dest_city_id: Number(form.dest_city_id),
    weight_kg: Number(form.weight_kg),
    length_cm: Number(form.length_cm || 0),
    width_cm: Number(form.width_cm || 0),
    height_cm: Number(form.height_cm || 0),
    declared_value: Number(form.declared_value || 0),
  });

  useEffect(() => {
    if (!form.origin_city_id || !form.dest_city_id || !Number(form.weight_kg)) return;
    let live = true;
    const t = setTimeout(() => {
      const b = body();
      apiFetch("/api/tariffs/quote", {
        method: "POST",
        body: {
          origin_city_id: b.origin_city_id, dest_city_id: b.dest_city_id,
          service_code: b.service_code, weight_kg: b.weight_kg, length_cm: b.length_cm,
          width_cm: b.width_cm, height_cm: b.height_cm, declared_value: b.declared_value,
          use_insurance: b.use_insurance,
        },
      })
        .then((r) => live && setQuote(r.quotes?.[0] || null))
        .catch(() => live && setQuote(null));
    }, 300);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.origin_city_id, form.dest_city_id, form.service_code, form.weight_kg,
      form.length_cm, form.width_cm, form.height_cm, form.declared_value, form.use_insurance]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const out = await apiFetch("/api/orders", { method: "POST", body: body(), idempotencyKey: idem });
      setCreated(out);
      setIdem(generateIdempotencyKey());
      setForm(EMPTY);
      showToast(`Resi terbit: ${out.shipment.code}`, "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cityOpts = ref.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>);
  const field = (label, k, props = {}) => (
    <div className="form-group">
      <label>{label}</label>
      <input className="form-control" value={form[k]} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Buat Pesanan Pengiriman</h1>
          <p className="page-sub">Nomor resi dan biaya dihitung otomatis oleh server.</p>
        </div>
      </div>

      {created && (
        <div className="card-box" style={{ marginBottom: 18, background: "#f0fdf4", borderColor: "#86efac" }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>{created.shipment.code}</div>
          <div style={{ fontSize: 13, margin: "4px 0 10px" }}>
            {created.origin_city} → {created.dest_city} · {created.quote.service_name} · Total{" "}
            <strong>{formatRupiah(created.shipment.total_cost)}</strong>
          </div>
          <Link className="btn-primary" to={`/lacak?code=${encodeURIComponent(created.shipment.code)}`}>Lihat Pelacakan</Link>
        </div>
      )}

      <form onSubmit={submit} className="grid-2" style={{ alignItems: "start" }}>
        <div className="card-box">
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Pengirim dan Penerima</h2>
          {field("Nama Pengirim", "sender_name", { required: true })}
          {field("No. HP Pengirim", "sender_phone", { required: true, placeholder: "08xxxxxxxxxx" })}
          <div className="form-group"><label>Kota Asal</label>
            <select className="form-control" value={form.origin_city_id} onChange={set("origin_city_id")} required>
              <option value="">-- Pilih --</option>{cityOpts}</select></div>
          {field("Alamat Pengirim", "sender_address", { required: true })}
          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "14px 0" }} />
          {field("Nama Penerima", "receiver_name", { required: true })}
          {field("No. HP Penerima", "receiver_phone", { required: true, placeholder: "08xxxxxxxxxx" })}
          <div className="form-group"><label>Kota Tujuan</label>
            <select className="form-control" value={form.dest_city_id} onChange={set("dest_city_id")} required>
              <option value="">-- Pilih --</option>{cityOpts}</select></div>
          {field("Alamat Penerima", "receiver_address", { required: true })}
        </div>

        <div className="card-box">
          <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Paket dan Layanan</h2>
          <div className="form-group"><label>Layanan</label>
            <select className="form-control" value={form.service_code} onChange={set("service_code")}>
              {(ref.services.length ? ref.services : [{ code: "REG", name: "Reguler" }]).map((s) => (
                <option key={s.code} value={s.code}>{s.code} - {s.name}</option>))}
            </select></div>
          <div className="grid-2" style={{ gap: 10 }}>
            {field("Berat (kg)", "weight_kg", { type: "number", min: "0.1", step: "0.1", required: true })}
            {field("Nilai Barang (Rp)", "declared_value", { type: "number", min: "0" })}
          </div>
          <div className="grid-3" style={{ gap: 10 }}>
            {field("P (cm)", "length_cm", { type: "number", min: "0" })}
            {field("L (cm)", "width_cm", { type: "number", min: "0" })}
            {field("T (cm)", "height_cm", { type: "number", min: "0" })}
          </div>
          <div className="grid-2" style={{ gap: 10 }}>
            <div className="form-group"><label>Pembayaran</label>
              <select className="form-control" value={form.payment_status} onChange={set("payment_status")}>
                <option value="PAID">Lunas</option><option value="COD">COD</option><option value="UNPAID">Belum Dibayar</option>
              </select></div>
            <div className="form-group"><label>Kanal</label>
              <select className="form-control" value={form.channel} onChange={set("channel")}>
                <option value="LOKET">Loket</option><option value="ONLINE">Online</option>
              </select></div>
          </div>
          <label style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input type="checkbox" checked={form.use_insurance} onChange={set("use_insurance")} /> Sertakan asuransi
          </label>

          {quote && (
            <div style={{ padding: 12, borderRadius: 10, background: "var(--brand-soft)", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>ESTIMASI BIAYA</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{formatRupiah(quote.total_cost)}</div>
              <div style={{ fontSize: 12.5 }}>Berat tagih {quote.chargeable_weight_kg} kg</div>
            </div>
          )}
          {error && <div className="degraded-banner" role="alert">{error}</div>}
          <button className="btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan dan Terbitkan Resi"}
          </button>
        </div>
      </form>
    </div>
  );
}
