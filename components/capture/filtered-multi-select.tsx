"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { inputClassName } from "@/components/capture/field";
import { cn } from "@/lib/utils";
import type { FilteredSelectOption } from "@/components/capture/filtered-select";

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function FilteredMultiSelect({
  values,
  options,
  onChange,
  maxSelections,
  selectionCount,
  selectionTotal,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Buscar…",
  emptyLabel = "Sin resultados",
  confirmLabel = "Agregar",
  onConfirm,
  disabled,
}: {
  values: string[];
  options: FilteredSelectOption[];
  onChange: (values: string[]) => void;
  /** Maximum number of checked items allowed (e.g. remaining slots). */
  maxSelections?: number | null;
  /** Shown as "m de n seleccionados" when both are set (e.g. enrolled+pending / capacity). */
  selectionCount?: number | null;
  selectionTotal?: number | null;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  confirmLabel?: string;
  /** Called when the user confirms the current checkbox selection. */
  onConfirm?: (values: string[]) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedSet = useMemo(() => new Set(values), [values]);
  const max =
    typeof maxSelections === "number" && Number.isFinite(maxSelections)
      ? Math.max(0, maxSelections)
      : null;
  const atLimit = max != null && values.length >= max;

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

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const trigger = rootRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const preferredWidth = Math.max(rect.width, 280);
      const maxLeft = window.innerWidth - preferredWidth - viewportPadding;
      const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));

      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;
      const available = Math.max(180, openUp ? spaceAbove - 4 : spaceBelow - 4);

      setMenuPosition({
        top: openUp
          ? Math.max(viewportPadding, rect.top - available - 4)
          : rect.bottom + 4,
        left,
        width: preferredWidth,
        maxHeight: Math.min(available, window.innerHeight - viewportPadding * 2),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, filtered.length, values.length]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

  function toggle(value: string) {
    if (selectedSet.has(value)) {
      onChange(values.filter((v) => v !== value));
      return;
    }
    if (atLimit) return;
    onChange([...values, value]);
  }

  const summaryCount =
    selectionCount != null ? selectionCount : values.length;
  const summaryTotal =
    selectionTotal != null ? selectionTotal : max;

  const selectionSummary =
    summaryTotal != null
      ? `${summaryCount} de ${summaryTotal} seleccionados`
      : values.length > 0
        ? `${values.length} seleccionados`
        : null;

  const displayLabel =
    values.length === 0 && selectionSummary == null
      ? placeholder
      : (selectionSummary ?? placeholder);

  const menu =
    open && mounted && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
              zIndex: 100,
            }}
            className="flex flex-col overflow-hidden rounded-[10px] border border-[#d7dee9] bg-white shadow-[0_10px_30px_rgba(19,53,105,0.18)]"
          >
            <div className="shrink-0 border-b border-dx-line p-2">
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className={cn(inputClassName, "w-full py-2")}
              />
            </div>
            <div className="shrink-0 border-b border-dx-line px-3 py-2 text-xs font-semibold text-dx-muted">
              {selectionSummary ?? `${values.length} seleccionados`}
              {atLimit ? " · cupo completo" : null}
            </div>
            <ul
              id={listId}
              role="listbox"
              aria-multiselectable
              className="min-h-0 flex-1 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-dx-muted">{emptyLabel}</li>
              ) : (
                filtered.map((option) => {
                  const checked = selectedSet.has(option.value);
                  const locked = !checked && atLimit;
                  return (
                    <li key={option.value}>
                      <label
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#f5f8ff]",
                          checked && "bg-[#eef3ff] font-semibold text-dx-blue",
                          locked && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggle(option.value)}
                          className="size-4 shrink-0 accent-dx-blue"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {option.label}
                        </span>
                        {option.meta ? (
                          <span className="shrink-0 text-xs text-dx-muted">
                            {option.meta}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="flex shrink-0 justify-end gap-2 border-t border-dx-line bg-white p-2">
              <button
                type="button"
                className="rounded-[8px] px-3 py-1.5 text-sm font-semibold text-[#5d697d] hover:bg-[#f5f8ff]"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={values.length === 0}
                className={cn(
                  "rounded-[8px] bg-dx-blue px-3 py-1.5 text-sm font-semibold text-white",
                  values.length === 0 && "opacity-50",
                )}
                onClick={() => {
                  onConfirm?.(values);
                  setOpen(false);
                }}
              >
                {confirmLabel}
                {values.length > 0 ? ` (${values.length})` : ""}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative min-w-[240px]">
      <button
        type="button"
        disabled={disabled || max === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          inputClassName,
          "flex w-full items-center justify-between gap-2 text-left",
          values.length === 0 && "text-dx-muted",
          (disabled || max === 0) && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="min-w-0 truncate">{displayLabel}</span>
        <span className="shrink-0 text-[#8090a8]" aria-hidden>
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}
