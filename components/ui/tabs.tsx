import Link from "next/link";
import { cn } from "@/lib/utils";

export function Tabs({
  items,
}: {
  items: { href: string; label: string; active?: boolean }[];
}) {
  return (
    <div className="my-4 flex gap-1.5 rounded-xl border border-dx-line bg-white p-1.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-lg px-3.5 py-2 text-sm font-bold text-[#5d697d]",
            item.active && "bg-[#edf4ff] text-dx-blue",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
