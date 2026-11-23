import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  side = "right",
  title = "Menu",
  children,
  className,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const initialX = side === "right" ? "100%" : "-100%";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          />

          <motion.div
            initial={{ x: initialX }}
            animate={{ x: 0 }}
            exit={{ x: initialX }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className={cn(
              "relative z-10 flex h-dvh w-[min(320px,86vw)] flex-col bg-card text-card-foreground shadow-2xl border-border",
              side === "right" ? "ml-auto border-l" : "mr-auto border-r",
              className
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="text-base font-extrabold tracking-tight text-foreground">{title}</span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Tutup menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground hover:bg-muted cursor-pointer"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
