/**
 * Single Responsibility: Deterministic server-side tracking code generator with Luhn check digit.
 * Format: LCK-{SERVICE}-YYMMDD-NNNNNC (service code + 5-digit sequence + 1 Luhn check digit)
 */
export class ResiGenerator {
  static luhnCheckDigit(digits) {
    let total = 0;
    const rev = [...String(digits)].reverse().map(Number);
    for (let i = 0; i < rev.length; i++) {
      let d = rev[i];
      if (i % 2 === 0) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      total += d;
    }
    return String((10 - (total % 10)) % 10);
  }

  static formatResi(dateObj, seqNum, serviceCode = "REG") {
    const svc = String(serviceCode || "REG").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "REG";
    const yy = String(dateObj.getUTCFullYear()).slice(-2);
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getUTCDate()).padStart(2, "0");
    const datePart = `${yy}${mm}${dd}`;
    const seqPart = String(seqNum).padStart(5, "0");
    const check = this.luhnCheckDigit(datePart + seqPart);
    return `LCK-${svc}-${datePart}-${seqPart}${check}`;
  }

  static verifyLuhn(code) {
    const parts = String(code || "").trim().toUpperCase().split("-");
    let datePart = "";
    let numPart = "";
    if (parts.length === 4 && parts[0] === "LCK" && /^[A-Z0-9]{2,6}$/.test(parts[1])) {
      datePart = parts[2];
      numPart = parts[3];
    } else if (parts.length === 3 && parts[0] === "LOG") {
      datePart = parts[1];
      numPart = parts[2];
    } else {
      return false;
    }
    if (!/^\d{6}$/.test(datePart) || !/^\d{6}$/.test(numPart)) return false;
    const expected = this.luhnCheckDigit(datePart + numPart.slice(0, 5));
    return numPart[5] === expected;
  }
}
