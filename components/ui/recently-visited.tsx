import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RecentVisitItem } from "@/hooks/use-recent-visits";

/**
 * Horizontal strip of recent-visit pills. Reusable across sports.
 * Hidden below `lg` so it sits beside filters on desktop only.
 */
export function RecentlyVisited({
  items,
  label = "Visitado recientemente",
  className,
}: {
  items: RecentVisitItem[];
  label?: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "hidden min-w-0 flex-1 items-center gap-2.5 lg:flex",
        className,
      )}
    >
      <span className="shrink-0 text-[12px] font-bold whitespace-nowrap text-dx-muted">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="inline-flex max-w-[160px] items-center truncate rounded-full border border-dx-line bg-white px-2.5 py-1 text-[12px] font-semibold text-dx-ink transition hover:border-dx-blue hover:text-dx-blue"
            title={item.label}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
