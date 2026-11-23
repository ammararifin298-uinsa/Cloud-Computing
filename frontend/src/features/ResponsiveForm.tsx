import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FiRotateCcw, FiSearch } from "react-icons/fi";
import { toast } from "sonner";
import { apiClient } from "@/lib/axios";
import { trackResiSchema, type TrackResiFormValues } from "@/schemas/exampleSchema";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResponsiveFormProps {
  onResult?: (code: string) => void;
}

export function ResponsiveForm({ onResult }: ResponsiveFormProps) {
  const { recentSearches, addRecentSearch, setLastTracked, clearRecentSearches } = useAppStore();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TrackResiFormValues>({
    resolver: zodResolver(trackResiSchema),
    defaultValues: { shipmentCode: "" },
  });

  const onSubmit = async (values: TrackResiFormValues) => {
    const cleanCode = values.shipmentCode.trim().toUpperCase();
    try {
      const { data } = await apiClient.get(`/api/shipments/${encodeURIComponent(cleanCode)}/events`);
      addRecentSearch(cleanCode);
      setLastTracked(data.shipment);
      toast.success(`Resi ${cleanCode} ditemukan (${data.shipment.current_status})`);
      if (onResult) onResult(cleanCode);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nomor resi tidak ditemukan.");
    }
  };

  return (
    <Card>
      <CardHeader className="p-5 sm:p-6">
        <CardTitle>Pencarian Cepat Resi</CardTitle>
        <CardDescription>
          Ramah layar sentuh dengan validasi Zod, React Hook Form, Axios, dan Zustand.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="space-y-2">
            <Label htmlFor="resp-resi">Nomor Resi Pengiriman</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="resp-resi"
                placeholder="Masukkan nomor resi Anda"
                className="min-h-[44px] text-base sm:text-sm font-mono uppercase"
                {...register("shipmentCode")}
              />
              <Button type="submit" disabled={isSubmitting} className="min-h-[44px] w-full sm:w-auto px-5">
                <FiSearch className="h-4 w-4" />
                {isSubmitting ? "Mencari..." : "Lacak"}
              </Button>
            </div>
            {errors.shipmentCode && (
              <p className="text-xs font-semibold text-destructive">{errors.shipmentCode.message}</p>
            )}
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground font-semibold">Riwayat:</span>
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setValue("shipmentCode", item, { shouldValidate: true })}
                  className="min-h-[36px] rounded-full border border-border bg-muted px-3 text-xs font-mono font-semibold text-foreground hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                onClick={clearRecentSearches}
                className="inline-flex min-h-[36px] items-center gap-1 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <FiRotateCcw className="h-3.5 w-3.5" />
                Bersihkan
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
