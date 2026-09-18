"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TextInput } from "@/components/capture/field";
import { LoadingBlock } from "@/components/ui/spinner";

export type MasterSelectItem = {
  id: string;
  href: string;
  title: string;
  meta?: string;
  imageUrl?: string | null;
  fallback?: string;
};

export function MasterSelectList({
  items,
  searchPlaceholder = "Buscar…",
  emptyLabel,
  isLoading,
  error,
}: {
  items: MasterSelectItem[];
  searchPlaceholder?: string;
  emptyLabel: string;
  isLoading?: boolean;
  error?: string | null;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [item.title, item.meta].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  if (isLoading) {
    return <LoadingBlock compact label="Cargando…" />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.length > 6 ? (
        <TextInput
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-dx-muted">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px] hover:border-[#becae0]"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dx-line bg-white text-[10px] font-black text-dx-blue">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="max-h-[38px] max-w-[38px] object-contain"
                    />
                  ) : (
                    (item.fallback ?? item.title).slice(0, 3).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-[17px] font-semibold">
                    {item.title}
                  </h3>
                  {item.meta ? (
                    <div className="mt-1 truncate text-[13px] text-dx-muted">
                      {item.meta}
                    </div>
                  ) : null}
                </div>
              </div>
              <span className="text-2xl text-[#8090a8]">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
