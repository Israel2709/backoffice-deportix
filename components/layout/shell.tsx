"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Inicio", match: (path: string) => path === "/" },
  {
    href: "/datos-maestros",
    label: "Datos Maestros",
    match: (path: string) => path.startsWith("/datos-maestros"),
  },
  {
    href: "/operacion",
    label: "Operación Deportiva",
    match: (path: string) => path.startsWith("/operacion"),
  },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-dx-line bg-white px-[18px] py-[22px] lg:block">
        <div className="mb-7 flex justify-center">
          <Image
            src="/brand/deportix-api-logo.png"
            alt="DeportiX API"
            width={150}
            height={120}
            className="h-auto max-h-[120px] w-auto max-w-[150px] object-contain"
            priority
          />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "my-[5px] flex items-center gap-2.5 rounded-[10px] px-[13px] py-3 font-semibold text-[#445067]",
                  active && "bg-[#edf4ff] text-dx-blue",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full bg-[#c8d1df]",
                    active && "bg-dx-blue",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="px-5 py-5 md:px-9 md:py-[30px] md:pb-[50px]">
        <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-[10px] border border-dx-line bg-white px-3 py-2 text-sm font-semibold text-[#445067]",
                  active && "border-[#c9d7ef] bg-[#edf4ff] text-dx-blue",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {children}
      </main>
    </div>
  );
}
