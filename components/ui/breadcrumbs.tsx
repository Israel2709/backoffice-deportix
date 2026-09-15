import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <div className="text-[13px] text-[#738096]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 && <span className="mx-1.5">›</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-dx-ink">
                {item.label}
              </Link>
            ) : (
              <b className={cn(isLast && "text-dx-ink font-semibold")}>
                {item.label}
              </b>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
