import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Loader2
      aria-hidden
      className={cn(
        "animate-spin text-dx-blue",
        size === "sm" && "h-4 w-4",
        size === "md" && "h-5 w-5",
        size === "lg" && "h-8 w-8",
        className,
      )}
    />
  );
}

export function LoadingBlock({
  label = "Cargando…",
  className,
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2.5 text-sm text-dx-muted",
        compact ? "py-4" : "min-h-[160px] py-10",
        className,
      )}
    >
      <Spinner size={compact ? "sm" : "md"} />
      <span>{label}</span>
    </div>
  );
}

export function LoadingOverlay({
  label = "Cargando…",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-white/55 backdrop-blur-[1px]"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-dx-line bg-white px-5 py-4 shadow-sm">
        <Spinner />
        <span className="text-sm font-semibold text-dx-ink">{label}</span>
      </div>
    </div>
  );
}
