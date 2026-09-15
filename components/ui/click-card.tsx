import Link from "next/link";
import { cn } from "@/lib/utils";

export function ClickCard({
  href,
  title,
  description,
  icon,
  cta,
  className,
}: {
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  cta?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-2xl border border-dx-line bg-dx-card p-5 transition hover:border-[#b9c9e7] hover:shadow-[0_6px_20px_rgba(19,53,105,0.07)]",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        {icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-[22px]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-[21px] font-semibold text-dx-ink">{title}</h2>
          <p className="mt-2 mb-4 text-[15px] leading-relaxed text-dx-muted">
            {description}
          </p>
          {cta ? (
            <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold text-white">
              {cta}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
