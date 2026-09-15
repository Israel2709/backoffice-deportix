import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  crumbs,
  children,
}: {
  crumbs: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="mb-[22px] flex items-center justify-between gap-5">
        <div>{crumbs}</div>
        <div className="text-[13px] text-[#69758a]">Administrador</div>
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
