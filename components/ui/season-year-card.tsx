import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Large year tile for Operación season-first pickers (soccer, F1, …).
 * Avoids CountryCardsGrid’s 12-col layout, which crushes years into pills.
 */
export function SeasonYearCard({
  year,
  href,
  className,
}: {
  year: number;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[112px] flex-col items-center justify-center rounded-2xl border border-dx-line bg-dx-card px-4 py-6 text-center shadow-[0_4px_14px_rgba(19,53,105,0.08)] transition",
        "hover:border-[#b9c9e7] hover:shadow-[0_8px_22px_rgba(19,53,105,0.14)]",
        className,
      )}
    >
      <span className="text-[28px] font-black tracking-tight text-dx-blue md:text-[32px]">
        {year}
      </span>
      <span className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-dx-muted">
        Temporada
      </span>
    </Link>
  );
}

export function SeasonYearsGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
