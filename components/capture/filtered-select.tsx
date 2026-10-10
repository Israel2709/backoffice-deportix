"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { inputClassName } from "@/components/capture/field";
import { cn } from "@/lib/utils";

export type FilteredSelectOption = {
  value: string;
  label: string;
  meta?: string;
};

export function FilteredSelect({
  value,
  options,
  onChange,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar…",
  emptyLabel = "Sin resultados",
  disabled,
  invalid,
}: {
  value: string;
  options: FilteredSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const hay = [option.label, option.meta]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const displayLabel = selected
    ? selected.meta
      ? `${selected.label} (${selected.meta})`
      : selected.label
    : placeholder;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          inputClassName,
          "flex w-full items-center justify-between gap-2 text-left",
          !selected && "text-dx-muted",
          invalid && "border-[#f04438]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="min-w-0 truncate">{displayLabel}</span>
        <span className="shrink-0 text-[#8090a8]" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[10px] border border-[#d7dee9] bg-white shadow-[0_10px_30px_rgba(19,53,105,0.12)]">
          <div className="border-b border-dx-line p-2">
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className={cn(inputClassName, "w-full py-2")}
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-dx-muted">{emptyLabel}</li>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[#f5f8ff]",
                        isSelected && "bg-[#eef3ff] font-semibold text-dx-blue",
                      )}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {option.meta ? (
                        <span className="shrink-0 text-xs text-dx-muted">
                          {option.meta}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
