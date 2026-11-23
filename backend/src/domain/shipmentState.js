import { ForbiddenError, InvalidTransitionError } from "./errors.js";

export const ShipmentStatus = Object.freeze({
  BOOKED: "BOOKED",
  DITERIMA: "DITERIMA",
  DISIMPAN: "DISIMPAN",
  DALAM_PERJALANAN: "DALAM_PERJALANAN",
  DIKIRIM: "DIKIRIM",
  GAGAL_KIRIM: "GAGAL_KIRIM",
  RETUR: "RETUR",
  BATAL: "BATAL",
  SELESAI: "SELESAI",
});

export const TERMINAL_STATUSES = new Set([
  ShipmentStatus.SELESAI,
  ShipmentStatus.RETUR,
  ShipmentStatus.BATAL,
]);

const TRANSITION_RULES = new Map([
  ["BOOKED->DITERIMA", { roles: new Set(["operator", "admin", "superadmin"]), requiresProof: false }],
  ["BOOKED->BATAL", { roles: new Set(["operator", "admin", "superadmin"]), requiresProof: false }],
  ["DITERIMA->DISIMPAN", { roles: new Set(["operator", "admin", "superadmin"]), requiresProof: false }],
  ["DITERIMA->DALAM_PERJALANAN", { roles: new Set(["operator", "kurir", "admin", "superadmin"]), requiresProof: false }],
  ["DITERIMA->BATAL", { roles: new Set(["admin", "superadmin"]), requiresProof: false }],
  ["DISIMPAN->DALAM_PERJALANAN", { roles: new Set(["operator", "kurir", "admin", "superadmin"]), requiresProof: false }],
  ["DISIMPAN->DIKIRIM", { roles: new Set(["operator", "kurir", "admin", "superadmin"]), requiresProof: false }],
  ["DALAM_PERJALANAN->DISIMPAN", { roles: new Set(["operator", "admin", "superadmin"]), requiresProof: false }],
  ["DALAM_PERJALANAN->DIKIRIM", { roles: new Set(["operator", "kurir", "admin", "superadmin"]), requiresProof: false }],
  ["DIKIRIM->SELESAI", { roles: new Set(["kurir", "operator", "admin", "superadmin"]), requiresProof: true }],
  ["DIKIRIM->GAGAL_KIRIM", { roles: new Set(["kurir", "operator", "admin", "superadmin"]), requiresProof: true }],
  ["GAGAL_KIRIM->DIKIRIM", { roles: new Set(["kurir", "operator", "admin", "superadmin"]), requiresProof: false }],
  ["GAGAL_KIRIM->DISIMPAN", { roles: new Set(["operator", "admin", "superadmin"]), requiresProof: false }],
  ["GAGAL_KIRIM->RETUR", { roles: new Set(["operator", "admin", "superadmin"]), requiresProof: true }],
]);

/**
 * State Pattern: Enforces valid shipment status transitions and role permissions.
 */
export class ShipmentStateMachine {
  static allowedNext(currentStatus) {
    const prefix = `${currentStatus}->`;
    const result = [];
    for (const key of TRANSITION_RULES.keys()) {
      if (key.startsWith(prefix)) result.push(key.slice(prefix.length));
    }
    return result;
  }

  static validate(currentStatus, nextStatus, role) {
    if (TERMINAL_STATUSES.has(currentStatus)) {
      throw new InvalidTransitionError(
        `Status ${currentStatus} bersifat final dan tidak dapat diubah lagi ke ${nextStatus}.`
      );
    }
    const rule = TRANSITION_RULES.get(`${currentStatus}->${nextStatus}`);
    if (!rule) {
      const allowed = this.allowedNext(currentStatus);
      throw new InvalidTransitionError(
        `Transisi status tidak valid: ${currentStatus} -> ${nextStatus}. Status berikutnya yang diizinkan: ${allowed.join(", ") || "tidak ada"}.`
      );
    }
    if (!rule.roles.has(role)) {
      throw new ForbiddenError(
        `Role '${role}' tidak berwenang mengubah status dari ${currentStatus} ke ${nextStatus}.`
      );
    }
    return rule.requiresProof;
  }
}
