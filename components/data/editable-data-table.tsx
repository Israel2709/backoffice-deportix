"use client";

import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { cn } from "@/lib/utils";

export type EditableColumn<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  placeholder?: string;
  className?: string;
  /** Optional display formatter (edit still uses raw string value). */
  format?: (value: string, row: T) => string;
};

type EditableDataTableProps<T extends { id: string }> = {
  columns: EditableColumn<T>[];
  rows: T[];
  /** Map row → string values used for edit/filter/sort. */
  getValues: (row: T) => Record<string, string>;
  /** When omitted, the table is browse-only (no inline edit / save). */
  onSave?: (
    changes: Array<{ id: string; values: Record<string, string> }>,
  ) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  /** When set, rows navigate on click (browse lists). */
  rowHref?: (row: T) => string;
  saving?: boolean;
  deletingId?: string | null;
  emptyLabel?: string;
  filterPlaceholder?: string;
};

type SortState = { columnId: string; direction: "asc" | "desc" } | null;

function cellKey(rowId: string, columnId: string) {
  return `${rowId}:${columnId}`;
}

export function EditableDataTable<T extends { id: string }>({
  columns,
  rows,
  getValues,
  onSave,
  onDelete,
  rowHref,
  saving = false,
  deletingId = null,
  emptyLabel = "Sin registros.",
  filterPlaceholder = "Filtrar…",
}: EditableDataTableProps<T>) {
  const editableMode = Boolean(onSave);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [baseline, setBaseline] = useState("{}");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState>(null);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      next[row.id] = getValues(row);
    }
    setDraft(next);
    setBaseline(JSON.stringify(next));
  }, [rows, getValues]);

  const dirty = editableMode && JSON.stringify(draft) !== baseline;
  useDirtyGuard(dirty);

  const baselineMap = useMemo(
    () => JSON.parse(baseline) as Record<string, Record<string, string>>,
    [baseline],
  );

  const filteredSorted = useMemo(() => {
    let list = [...rows];

    for (const col of columns) {
      if (!col.filterable) continue;
      const q = (filters[col.id] ?? "").trim().toLowerCase();
      if (!q) continue;
      list = list.filter((row) => {
        const value = (draft[row.id]?.[col.id] ?? "").toLowerCase();
        return value.includes(q);
      });
    }

    if (sort) {
      const { columnId, direction } = sort;
      list.sort((a, b) => {
        const av = (draft[a.id]?.[columnId] ?? "").toLowerCase();
        const bv = (draft[b.id]?.[columnId] ?? "").toLowerCase();
        const cmp = av.localeCompare(bv, "es", { sensitivity: "base" });
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return list;
  }, [rows, columns, filters, sort, draft]);

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { columnId, direction: "desc" };
      }
      return null;
    });
  }

  function updateCell(rowId: string, columnId: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] ?? {}),
        [columnId]: value,
      },
    }));
  }

  function discard() {
    setDraft(JSON.parse(baseline) as Record<string, Record<string, string>>);
  }

  async function handleSave() {
    if (!onSave) return;
    const changes: Array<{ id: string; values: Record<string, string> }> = [];

    for (const [id, values] of Object.entries(draft)) {
      if (JSON.stringify(values) !== JSON.stringify(baselineMap[id] ?? {})) {
        changes.push({ id, values });
      }
    }

    if (changes.length === 0) return;
    await onSave(changes);
  }

  const showActions = Boolean(onDelete || rowHref);
  const colSpan = columns.length + (showActions ? 1 : 0);

  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (!sort || sort.columnId !== columnId) {
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-dx-blue" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-dx-blue" />
    );
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc]">
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "border-b border-dx-line px-3 py-2.5 align-bottom",
                    col.className,
                  )}
                >
                  <div className="space-y-1.5">
                    {col.sortable !== false ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-[#667085] uppercase hover:text-dx-blue"
                      >
                        {col.header}
                        <SortIcon columnId={col.id} />
                      </button>
                    ) : (
                      <span className="text-[11px] font-extrabold tracking-wide text-[#667085] uppercase">
                        {col.header}
                      </span>
                    )}
                    {col.filterable !== false ? (
                      <input
                        value={filters[col.id] ?? ""}
                        onChange={(e) =>
                          setFilters((prev) => ({
                            ...prev,
                            [col.id]: e.target.value,
                          }))
                        }
                        placeholder={filterPlaceholder}
                        className="w-full rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1 text-[12px] font-normal text-[#243147] outline-none focus:border-dx-blue"
                      />
                    ) : null}
                  </div>
                </th>
              ))}
              {showActions ? (
                <th className="w-[88px] border-b border-dx-line px-3 py-2.5 text-center text-[11px] font-extrabold tracking-wide text-[#667085] uppercase">
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-8 text-center text-sm text-dx-muted"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => {
                const values = draft[row.id] ?? getValues(row);
                const rowDirty =
                  editableMode &&
                  JSON.stringify(values) !==
                    JSON.stringify(baselineMap[row.id] ?? {});
                const href = rowHref?.(row);

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      rowDirty && "bg-[#fffdf5]",
                      href && "hover:bg-[#f8fafc]",
                    )}
                  >
                    {columns.map((col) => {
                      const key = cellKey(row.id, col.id);
                      const raw = values[col.id] ?? "";
                      const isFocused = focused === key;
                      const editable =
                        editableMode && col.editable !== false;
                      const display = raw
                        ? (col.format?.(raw, row) ?? raw)
                        : (col.placeholder ?? "—");

                      return (
                        <td
                          key={col.id}
                          className={cn(
                            "border-b border-dx-line px-3 py-1.5",
                            col.className,
                          )}
                          onClick={() => {
                            if (editable) setFocused(key);
                          }}
                        >
                          {editable && isFocused ? (
                            <input
                              autoFocus
                              value={raw}
                              placeholder={col.placeholder}
                              onChange={(e) =>
                                updateCell(row.id, col.id, e.target.value)
                              }
                              onBlur={() => setFocused(null)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === "Escape") {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-full rounded-[7px] border border-dx-blue bg-white px-2 py-1.5 text-[13px] text-[#243147] outline-none ring-2 ring-[#edf4ff]"
                            />
                          ) : href && !editable ? (
                            <Link
                              href={href}
                              className={cn(
                                "block min-h-[34px] rounded-[7px] px-2 py-1.5 text-[13px] text-inherit hover:text-dx-blue",
                                !raw && "text-dx-muted",
                                col.id === "name" && "font-semibold",
                              )}
                            >
                              {display}
                            </Link>
                          ) : (
                            <div
                              tabIndex={editable ? 0 : undefined}
                              onFocus={() => {
                                if (editable) setFocused(key);
                              }}
                              className={cn(
                                "min-h-[34px] rounded-[7px] px-2 py-1.5 text-[13px]",
                                editable &&
                                  "cursor-text hover:bg-[#f5f8ff] focus:bg-[#edf4ff] focus:outline-none",
                                !raw && "text-dx-muted",
                                !editable &&
                                  col.id === "name" &&
                                  "font-semibold",
                              )}
                            >
                              {display}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {showActions ? (
                      <td className="border-b border-dx-line px-3 py-1.5 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          {href ? (
                            <Link
                              href={href}
                              title="Abrir"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8090a8] hover:bg-[#f5f8ff] hover:text-dx-blue"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          ) : null}
                          {onDelete ? (
                            <button
                              type="button"
                              title="Eliminar"
                              disabled={deletingId === row.id || saving}
                              onClick={() => void onDelete(row.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-dx-red hover:bg-[#fef3f2] disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-dx-muted">
          {filteredSorted.length} de {rows.length}
          {editableMode
            ? " · clic en una celda para editar"
            : rowHref
              ? " · clic en una fila para abrir"
              : ""}
          {dirty ? " · hay cambios sin guardar" : ""}
        </p>
        {editableMode ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!dirty || saving}
              onClick={discard}
            >
              Descartar
            </Button>
            <Button
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
