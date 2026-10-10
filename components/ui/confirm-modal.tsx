"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmingLabel = "Procesando…",
  tone = "danger",
  confirming = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmingLabel?: string;
  /** Visual emphasis for the confirm action. */
  tone?: "danger" | "primary";
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirming) onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, confirming, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-[#0f1c33]/45 backdrop-blur-[1px]"
        disabled={confirming}
        onClick={() => {
          if (!confirming) onCancel();
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative z-[1] w-full max-w-[420px] rounded-[18px] border border-dx-line bg-white p-6 shadow-[0_18px_50px_rgba(15,28,51,0.22)]"
      >
        <h2
          id={titleId}
          className="text-[18px] font-semibold leading-snug text-dx-ink"
        >
          {title}
        </h2>
        {description ? (
          <p
            id={descriptionId}
            className="mt-2 text-[14px] leading-relaxed text-dx-muted"
          >
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={confirming}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            autoFocus
            disabled={confirming}
            onClick={onConfirm}
            className={cn(
              tone === "danger" &&
                "bg-dx-red text-white hover:bg-[#c81e1e] hover:opacity-95",
            )}
          >
            {confirming ? confirmingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
