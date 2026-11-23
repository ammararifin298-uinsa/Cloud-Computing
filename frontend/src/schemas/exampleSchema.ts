import { z } from "zod";

export const trackResiSchema = z.object({
  shipmentCode: z
    .string()
    .trim()
    .min(3, "Nomor resi minimal 3 karakter")
    .max(50, "Nomor resi terlalu panjang")
    .regex(/^[A-Za-z0-9_-]+$/, "Nomor resi hanya boleh huruf, angka, tanda hubung, atau garis bawah"),
});

export type TrackResiFormValues = z.infer<typeof trackResiSchema>;
