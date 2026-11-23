import { ValidationError } from "./errors.js";

/**
 * Strategy Pattern: Standard server-side tariff calculation matching db/03-wilayah-jatim.sql.
 */
export class StandardTariffStrategy {
  calculate(rule, input) {
    const weightKg = Number(input.weight_kg);
    const lengthCm = Number(input.length_cm || 0);
    const widthCm = Number(input.width_cm || 0);
    const heightCm = Number(input.height_cm || 0);
    const declaredValue = Number(input.declared_value || 0);
    const useInsurance = Boolean(input.use_insurance);

    if (!(weightKg > 0)) {
      throw new ValidationError("Berat paket harus lebih besar dari 0 kg.");
    }
    if (lengthCm < 0 || widthCm < 0 || heightCm < 0) {
      throw new ValidationError("Dimensi paket tidak boleh bernilai negatif.");
    }
    if (declaredValue < 0) {
      throw new ValidationError("Nilai barang tidak boleh bernilai negatif.");
    }

    let volumetric = 0;
    if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
      volumetric = Number(((lengthCm * widthCm * heightCm) / Number(rule.volumetric_divisor)).toFixed(2));
    }

    const effective = Math.max(weightKg, volumetric);
    const chargeable = Math.max(1, Math.ceil(effective));

    if (chargeable > Number(rule.max_weight_kg)) {
      throw new ValidationError(
        `Berat tertagih (${chargeable} kg) melebihi batas maksimal layanan ${rule.service_code} (${rule.max_weight_kg} kg).`
      );
    }

    const shippingCost = Number(rule.base_price) + (chargeable - 1) * Number(rule.per_kg);
    const insuranceCost =
      useInsurance && declaredValue > 0
        ? Math.round(declaredValue * Number(rule.insurance_rate))
        : 0;

    return {
      service_code: rule.service_code,
      service_name: rule.service_name,
      actual_weight_kg: Number(weightKg.toFixed(2)),
      volumetric_weight_kg: volumetric,
      chargeable_weight_kg: chargeable,
      shipping_cost: shippingCost,
      insurance_cost: insuranceCost,
      total_cost: shippingCost + insuranceCost,
      eta_min_days: Number(rule.eta_min_days),
      eta_max_days: Number(rule.eta_max_days),
    };
  }
}

export class TariffCalculator {
  constructor(strategy = new StandardTariffStrategy()) {
    this.strategy = strategy;
  }

  quote(rule, input) {
    return this.strategy.calculate(rule, input);
  }
}
