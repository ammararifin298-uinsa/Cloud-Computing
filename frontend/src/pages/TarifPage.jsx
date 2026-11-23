import React, { useEffect, useState } from "react";
import { apiFetch, formatRupiah } from "../lib/api.js";

export default function TarifPage() {
  const [cities, setCities] = useState([]);
  const [loadingRef, setLoadingRef] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    origin_city_id: "",
    dest_city_id: "",
    weight_kg: "1",
    length_cm: "0",
    width_cm: "0",
    height_cm: "0",
    declared_value: "0",
    use_insurance: false,
  });

  useEffect(() => {
    let mounted = true;
    apiFetch("/api/reference")
      .then((data) => {
        if (!mounted) return;
        const list = data.cities || [];
        setCities(list);
        if (list.length >= 2) {
          const sby = list.find((c) => c.name.toLowerCase().includes("surabaya")) || list[0];
          const mlg = list.find((c) => c.name.toLowerCase().includes("malang")) || list[1];
          setForm((prev) => ({
            ...prev,
            origin_city_id: String(sby.id),
            dest_city_id: String(mlg.id),
          }));
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Gagal memuat daftar wilayah Jawa Timur.");
      })
      .finally(() => {
        if (mounted) setLoadingRef(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        origin_city_id: Number(form.origin_city_id),
        dest_city_id: Number(form.dest_city_id),
        weight_kg: Number(form.weight_kg),
        length_cm: Number(form.length_cm || 0),
        width_cm: Number(form.width_cm || 0),
        height_cm: Number(form.height_cm || 0),
        declared_value: Number(form.declared_value || 0),
        use_insurance: Boolean(form.use_insurance),
      };
      const out = await apiFetch("/api/tariffs/quote", { method: "POST", body: payload });
      setResult(out);
    } catch (err) {
      setError(err.message || "Gagal menghitung tarif pengiriman.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cek Tarif Pengiriman Jawa Timur</h1>
          <p className="page-sub">
            Hitung estimasi ongkos kirim berdasarkan berat aktual, dimensi volumetrik, dan pilihan layanan.
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <form className="card-box" onSubmit={handleSubmit}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Detail Pengiriman</h2>

          <div className="form-group">
            <label htmlFor="origin-city">Kota atau Kabupaten Asal</label>
            <select
              id="origin-city"
              className="form-control"
              value={form.origin_city_id}
              onChange={(e) => setForm({ ...form, origin_city_id: e.target.value })}
              disabled={loadingRef}
              required
            >
              <option value="">-- Pilih Wilayah Asal --</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.zone_name})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dest-city">Kota atau Kabupaten Tujuan</label>
            <select
              id="dest-city"
              className="form-control"
              value={form.dest_city_id}
              onChange={(e) => setForm({ ...form, dest_city_id: e.target.value })}
              disabled={loadingRef}
              required
            >
              <option value="">-- Pilih Wilayah Tujuan --</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.zone_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label htmlFor="weight-kg">Berat Aktual (kg)</label>
              <input
                id="weight-kg"
                type="number"
                step="0.1"
                min="0.1"
                max="500"
                className="form-control"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="declared-val">Nilai Barang (Rp, opsional)</label>
              <input
                id="declared-val"
                type="number"
                min="0"
                step="1000"
                className="form-control"
                value={form.declared_value}
                onChange={(e) => setForm({ ...form, declared_value: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-3" style={{ gap: 10 }}>
            <div className="form-group">
              <label htmlFor="dim-l">Panjang (cm)</label>
              <input
                id="dim-l"
                type="number"
                min="0"
                className="form-control"
                value={form.length_cm}
                onChange={(e) => setForm({ ...form, length_cm: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="dim-w">Lebar (cm)</label>
              <input
                id="dim-w"
                type="number"
                min="0"
                className="form-control"
                value={form.width_cm}
                onChange={(e) => setForm({ ...form, width_cm: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="dim-h">Tinggi (cm)</label>
              <input
                id="dim-h"
                type="number"
                min="0"
                className="form-control"
                value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
              />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13.5, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.use_insurance}
              onChange={(e) => setForm({ ...form, use_insurance: e.target.checked })}
            />
            Gunakan perlindungan asuransi barang
          </label>

          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting || loadingRef}>
            {submitting ? "Menghitung..." : "Hitung Estimasi Tarif"}
          </button>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </form>

        <div className="card-box">
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Hasil Perhitungan Tarif</h2>
          {!result ? (
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
              Pilih wilayah asal, wilayah tujuan, dan berat paket untuk melihat rincian biaya dari setiap pilihan layanan.
            </p>
          ) : (
            <div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--brand-soft)",
                  color: "var(--brand)",
                  fontWeight: 700,
                  fontSize: 13.5,
                  marginBottom: 14,
                }}
              >
                Rute: {result.origin_city} → {result.dest_city}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {result.quotes.map((q) => (
                  <div
                    key={q.service_code}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      padding: 16,
                      background: "var(--surface-2)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <span
                          className="mono"
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "var(--brand)",
                            color: "#fff",
                            fontWeight: 700,
                            marginRight: 8,
                          }}
                        >
                          {q.service_code}
                        </span>
                        <strong style={{ fontSize: 15 }}>{q.service_name}</strong>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)" }}>
                        {formatRupiah(q.total_cost)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: 12.5, color: "var(--text-2)" }}>
                      <span>Estimasi: <strong>{q.eta_min_days === q.eta_max_days ? `${q.eta_min_days} hari` : `${q.eta_min_days}-${q.eta_max_days} hari`}</strong></span>
                      <span>Berat tagih: <strong>{q.chargeable_weight_kg} kg</strong></span>
                      <span>Ongkir: <strong>{formatRupiah(q.shipping_cost)}</strong></span>
                      {q.insurance_cost > 0 && (
                        <span>Asuransi: <strong>{formatRupiah(q.insurance_cost)}</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
