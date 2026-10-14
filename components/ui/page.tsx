import Link from "next/link";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

function parentCrumb(items: Crumb[]): Crumb | undefined {
  return [...items]
    .slice(0, -1)
    .reverse()
    .find((crumb) => Boolean(crumb.href));
}

export function PageHeader({
  items,
  crumbs,
  backLabel,
  actions,
  children,
}: {
  /** Preferred: structured crumbs — also drives the default back CTA. */
  items?: Crumb[];
  /** Legacy slot when `items` is not passed. */
  crumbs?: React.ReactNode;
  /** Override the auto back CTA label (href still comes from parent crumb). */
  backLabel?: string;
  /** Full override of the top-right actions (replaces auto back). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const parent = items ? parentCrumb(items) : undefined;
  const autoBack =
    parent?.href != null ? (
      <Link
        href={parent.href}
        className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#cbd8ee] bg-white px-3 py-1.5 text-[13px] font-bold text-dx-blue hover:bg-[#f5f8ff]"
      >
        ← {backLabel ?? parent.label}
      </Link>
    ) : null;

  return (
    <>
      <div
        className={cn(
          // Pull into main padding; bar itself uses py-3 top/bottom.
          "sticky top-0 z-20 -mx-5 -mt-5 mb-[22px] flex items-center justify-between gap-5",
          "border-b border-dx-line bg-dx-bg px-5 py-3",
          "md:-mx-9 md:-mt-[30px] md:px-9",
        )}
      >
        <div className="min-w-0">
          {items ? <Breadcrumbs items={items} /> : crumbs}
        </div>
        <div className="shrink-0">{actions ?? autoBack}</div>
      </div>
      {children}
    </>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-[22px]", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3.5">
          {title ? <h2 className="text-[21px] font-semibold">{title}</h2> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ListRow({
  href,
  title,
  meta,
  trailing,
}: {
  href?: string;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  const content = (
    <>
      <div>
        <div className="font-bold text-dx-ink">{title}</div>
        {meta ? <div className="mt-1 text-[13px] text-dx-muted">{meta}</div> : null}
      </div>
      <div className="flex items-center gap-3 text-[#8090a8]">
        {trailing}
        {href ? <span className="text-2xl">→</span> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px] hover:border-[#becae0]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]">
      {content}
    </div>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#d9e0e9] bg-[#f8fafc] p-[18px] text-dx-muted">
      {label} — captura y edición llegan en una fase posterior. Por ahora solo
      navegación y consulta de datos existentes en la API.
    </div>
  );
}
