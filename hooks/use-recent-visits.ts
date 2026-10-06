"use client";

import { useCallback, useEffect, useState } from "react";

export type RecentVisitItem = {
  id: string;
  label: string;
  href: string;
};

const DEFAULT_MAX = 5;

function readStorage(key: string): RecentVisitItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentVisitItem =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as RecentVisitItem).id === "string" &&
        typeof (item as RecentVisitItem).label === "string" &&
        typeof (item as RecentVisitItem).href === "string",
    );
  } catch {
    return [];
  }
}

function writeStorage(key: string, items: RecentVisitItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore quota / private mode errors
  }
}

/** Persist an MRU visit. Safe to call from effects. */
export function recordRecentVisit(
  storageKey: string,
  item: RecentVisitItem,
  max = DEFAULT_MAX,
) {
  if (!item.id || !item.label || !item.href) return;
  const next = [
    item,
    ...readStorage(storageKey).filter((entry) => entry.id !== item.id),
  ].slice(0, max);
  writeStorage(storageKey, next);
}

/**
 * MRU list persisted in localStorage. Scope with a unique `storageKey`
 * per sport/surface (e.g. `operacion:formula-1:countries`).
 */
export function useRecentVisits(storageKey: string, max = DEFAULT_MAX) {
  const [items, setItems] = useState<RecentVisitItem[]>([]);

  useEffect(() => {
    setItems(readStorage(storageKey).slice(0, max));
  }, [storageKey, max]);

  const push = useCallback(
    (item: RecentVisitItem) => {
      recordRecentVisit(storageKey, item, max);
      setItems(readStorage(storageKey).slice(0, max));
    },
    [storageKey, max],
  );

  const clear = useCallback(() => {
    writeStorage(storageKey, []);
    setItems([]);
  }, [storageKey]);

  return { items, push, clear };
}

/**
 * Records a visit once the item is available (e.g. after country resolves).
 */
export function useRecordRecentVisit(
  storageKey: string,
  item: RecentVisitItem | null | undefined,
  max = DEFAULT_MAX,
) {
  useEffect(() => {
    if (!item?.id || !item.label || !item.href) return;
    recordRecentVisit(storageKey, item, max);
  }, [storageKey, item?.id, item?.label, item?.href, max]);
}
