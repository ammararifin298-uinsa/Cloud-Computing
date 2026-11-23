import React from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        },
      }}
    />
  );
}
