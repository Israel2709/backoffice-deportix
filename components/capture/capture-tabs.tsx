"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type CaptureTabItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export function CaptureTabs({ items }: { items: CaptureTabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="my-4 flex flex-wrap gap-1.5 rounded-xl border border-dx-line bg-white p-1.5">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-bold text-[#5d697d]",
              active && "bg-[#edf4ff] text-dx-blue",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
