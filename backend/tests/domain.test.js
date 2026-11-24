import assert from "node:assert/strict";
import test from "node:test";
import { ShipmentStateMachine } from "../src/domain/shipmentState.js";
import { TariffCalculator } from "../src/domain/tariffCalculator.js";
import { ResiGenerator } from "../src/domain/resiGenerator.js";
import {
  hashPassword,
  maskNik,
  maskPhone,
  validateMediaMagicBytes,
  verifyPassword,
} from "../src/core/security.js";

test("ShipmentStateMachine: allows valid transition and blocks terminal/regression", () => {
  assert.equal(ShipmentStateMachine.validate("DITERIMA", "DISIMPAN", "operator"), false);
  assert.equal(ShipmentStateMachine.validate("DIKIRIM", "SELESAI", "kurir"), true);

  assert.throws(
    () => ShipmentStateMachine.validate("SELESAI", "DITERIMA", "superadmin"),
    /bersifat final/
  );
  assert.throws(
    () => ShipmentStateMachine.validate("BOOKED", "DITERIMA", "kurir"),
    /tidak berwenang/
  );
  assert.throws(
    () => ShipmentStateMachine.validate("DITERIMA", "SELESAI", "operator"),
    /Transisi status tidak valid/
  );
});

test("TariffCalculator: computes actual vs volumetric weight and insurance accurately", () => {
  const calc = new TariffCalculator();
  const rule = {
    service_code: "REG",
    service_name: "Reguler",
    volumetric_divisor: 6000,
    insurance_rate: 0.002,
    max_weight_kg: 50,
    base_price: 15000,
    per_kg: 5000,
    eta_min_days: 3,
    eta_max_days: 4,
  };

  // Actual 2.2 kg -> chargeable 3 kg -> 15000 + 2*5000 = 25000
  const q1 = calc.quote(rule, { weight_kg: 2.2 });
  assert.equal(q1.chargeable_weight_kg, 3);
  assert.equal(q1.shipping_cost, 25000);
  assert.equal(q1.insurance_cost, 0);

  // Volumetric 30x30x40 / 6000 = 6 kg > actual 2 kg -> 15000 + 5*5000 = 40000 + 2000 ins
  const q2 = calc.quote(rule, {
    weight_kg: 2,
    length_cm: 30,
    width_cm: 30,
    height_cm: 40,
    declared_value: 1_000_000,
    use_insurance: true,
  });
  assert.equal(q2.volumetric_weight_kg, 6);
  assert.equal(q2.chargeable_weight_kg, 6);
  assert.equal(q2.shipping_cost, 40000);
  assert.equal(q2.insurance_cost, 2000);
  assert.equal(q2.total_cost, 42000);

  assert.throws(() => calc.quote(rule, { weight_kg: 60 }), /melebihi batas maksimal/);
});

test("ResiGenerator: formats deterministic LCK-{SVC}-YYMMDD-NNNNNC with valid Luhn check digit", () => {
  const d = new Date("2026-11-23T00:00:00Z");
  const code = ResiGenerator.formatResi(d, 42, "EXP");
  assert.match(code, /^LCK-EXP-261123-00042\d$/);
  assert.equal(ResiGenerator.verifyLuhn(code), true);
  assert.equal(ResiGenerator.verifyLuhn("LOG-261123-000422"), true);
  // Corrupt last digit -> Luhn fails
  const bad = code.slice(0, -1) + ((Number(code.slice(-1)) + 1) % 10);
  assert.equal(ResiGenerator.verifyLuhn(bad), false);
});

test("Security: password hashing, PII masking, and upload magic-bytes block SVG/HTML XSS", () => {
  const hashed = hashPassword("rahasia123", 10_000);
  assert.equal(verifyPassword("rahasia123", hashed), true);
  assert.equal(verifyPassword("salah123", hashed), false);

  assert.equal(maskNik("3578010101900001"), "3578********0001");
  assert.equal(maskPhone("081234567890"), "0812*****890");

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  assert.deepEqual(validateMediaMagicBytes(png), { ext: ".png", mime: "image/png" });

  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  assert.deepEqual(validateMediaMagicBytes(jpg), { ext: ".jpg", mime: "image/jpeg" });

  const svgXss = Buffer.from('<svg onload="alert(1)"></svg>');
  assert.throws(() => validateMediaMagicBytes(svgXss, true), /Format file tidak diizinkan/);

  const htmlXss = Buffer.from("<html><script>alert(1)</script></html>");
  assert.throws(() => validateMediaMagicBytes(htmlXss, true), /Format file tidak diizinkan/);
});
