"use client";

import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FilteredSelect,
  type FilteredSelectOption,
} from "@/components/capture/filtered-select";
import { Button } from "@/components/ui/button";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { cn } from "@/lib/utils";

export type EditableColumn<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  /** Per-row override; when false, the cell stays read-only. */
  isCellEditable?: (row: T) => boolean;
  placeholder?: string;
  className?: string;
  /** Optional display formatter (edit still uses raw string value). */
  format?: (value: string, row: T) => string;
  /** Cell editor type. Defaults to text input. */
  editAs?: "text" | "select" | "date" | "time";
  /** Options for select editors (static or per-row). */
  options?:
    | FilteredSelectOption[]
    | ((
        row: T,
        draftValues: Record<string, string>,
      ) => FilteredSelectOption[]);
  /**
   * After a cell changes, return a full row draft patch (e.g. cascade
   * constructor when driver changes).
   */
  onCellChange?: (
    rowId: string,
    columnId: string,
    value: string,
    current: Record<string, string>,
    row: T,
  ) => Record<string, string> | void;
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
  /** Edit action in Acciones (e.g. open a modal). */
  onEdit?: (id: string) => void | Promise<void>;
  /** When set, rows navigate on click (browse lists). */
  rowHref?: (row: T) => string;
  /** Optional edit link shown in Acciones. */
  editHref?: (row: T) => string;
  /** Show the → open button in Acciones. Defaults to true when `rowHref` is set. */
  showOpenAction?: boolean;
  /** Row checkboxes for multi-select (e.g. bulk delete). */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  saving?: boolean;
  deletingId?: string | null;
  emptyLabel?: string;
  filterPlaceholder?: string;
};

type SortState = { columnId: string; direction: "asc" | "desc" } | null;

function cellKey(rowId: string, columnId: string) {
  return `${rowId}:${columnId}`;
}

function asFilterText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

/** Own-property only — avoids Object.prototype keys like `constructor`. */
function ownString(
  map: Record<string, string>,
  key: string,
): string {
  return Object.prototype.hasOwnProperty.call(map, key)
    ? asFilterText(map[key])
    : "";
}

export function EditableDataTable<T extends { id: string }>({
  columns,
  rows,
  getValues,
  onSave,
  onDelete,
  onEdit,
  rowHref,
  editHref,
  showOpenAction,
  selectable = false,
  selectedIds,
  onSelectionChange,
  saving = false,
  deletingId = null,
  emptyLabel = "Sin registros.",
  filterPlaceholder = "Filtrar…",
}: EditableDataTableProps<T>) {
  const editableMode = Boolean(onSave);
  const openAction = showOpenAction ?? Boolean(rowHref);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [baseline, setBaseline] = useState("{}");
  const [filters, setFilters] = useState<Record<string, string>>(() =>
    Object.create(null) as Record<string, string>,
  );
  const [sort, setSort] = useState<SortState>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selectionControlled = selectedIds !== undefined;
  const selected = selectionControlled ? selectedIds : internalSelected;

  function setSelected(next: string[]) {
    if (!selectionControlled) setInternalSelected(next);
    onSelectionChange?.(next);
  }

  useEffect(() => {
    const next: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      const values = getValues(row);
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(values)) {
        normalized[key] = asFilterText(value);
      }
      next[row.id] = normalized;
    }
    setDraft(next);
    setBaseline(JSON.stringify(next));
  }, [rows, getValues]);

  useEffect(() => {
    if (!selectable) return;
    const valid = new Set(rows.map((row) => row.id));
    const pruned = selected.filter((id) => valid.has(id));
    if (pruned.length !== selected.length) setSelected(pruned);
    // Only prune when row ids change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, selectable]);

  const dirty = editableMode && JSON.stringify(draft) !== baseline;
  useDirtyGuard(dirty);

  const baselineMap = useMemo(
    () => JSON.parse(baseline) as Record<string, Record<string, string>>,
    [baseline],
  );

  function displayValue(row: T, columnId: string): string {
    const raw = ownString(draft[row.id] ?? {}, columnId);
    const column = columns.find((col) => col.id === columnId);
    if (!raw) return "";
    return column?.format?.(raw, row) ?? raw;
  }

  const filteredSorted = useMemo(() => {
    let list = [...rows];

    for (const col of columns) {
      if (col.filterable === false) continue;
      const q = ownString(filters, col.id).trim().toLowerCase();
      if (!q) continue;
      list = list.filter((row) =>
        displayValue(row, col.id).toLowerCase().includes(q),
      );
    }

    if (sort) {
      const { columnId, direction } = sort;
      list.sort((a, b) => {
        const av = displayValue(a, columnId).toLowerCase();
        const bv = displayValue(b, columnId).toLowerCase();
        const cmp = av.localeCompare(bv, "es", {
          sensitivity: "base",
          numeric: true,
        });
        return direction === "asc" ? cmp : -cmp;
      });
    }

    return list;
    // displayValue closes over draft/columns; keep deps explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function updateCell(
    rowId: string,
    columnId: string,
    value: string,
    row?: T,
  ) {
    setDraft((prev) => {
      const current = { ...(prev[rowId] ?? {}) };
      const column = columns.find((col) => col.id === columnId);
      const patched =
        row && column?.onCellChange
          ? column.onCellChange(rowId, columnId, value, current, row)
          : undefined;
      return {
        ...prev,
        [rowId]: patched ?? { ...current, [columnId]: value },
      };
    });
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

  const showActions = Boolean(onDelete || onEdit || openAction || editHref);
  const colSpan =
    columns.length + (showActions ? 1 : 0) + (selectable ? 1 : 0);

  const visibleIds = filteredSorted.map((row) => row.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selected.includes(id));

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelected(selected.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelected([...new Set([...selected, ...visibleIds])]);
  }

  function toggleRow(rowId: string) {
    if (selected.includes(rowId)) {
      setSelected(selected.filter((id) => id !== rowId));
      return;
    }
    setSelected([...selected, rowId]);
  }

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
              {selectable ? (
                <th className="w-12 border-b border-dx-line px-3 py-2.5 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          someVisibleSelected && !allVisibleSelected;
                      }
                    }}
                    onChange={toggleAllVisible}
                    disabled={visibleIds.length === 0}
                    aria-label="Seleccionar todos"
                    className="h-4 w-4 cursor-pointer rounded border-[#cbd8ee] accent-dx-blue"
                  />
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "border-b border-dx-line px-3 py-2.5 align-bottom",
                    col.className,
                  )}
                >
                  <div
                    className={cn(
                      "flex gap-2",
                      col.filterable !== false
                        ? "items-center"
                        : "flex-col items-start gap-1.5",
                    )}
                  >
                    {col.sortable !== false ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-[#667085] uppercase hover:text-dx-blue"
                      >
                        {col.header}
                        <SortIcon columnId={col.id} />
                      </button>
                    ) : (
                      <span className="shrink-0 text-[11px] font-extrabold tracking-wide text-[#667085] uppercase">
                        {col.header}
                      </span>
                    )}
                    {col.filterable !== false ? (
                      <input
                        value={ownString(filters, col.id)}
                        onChange={(e) =>
                          setFilters((prev) => {
                            const next = Object.assign(
                              Object.create(null) as Record<string, string>,
                              prev,
                            );
                            next[col.id] = String(e.target.value ?? "");
                            return next;
                          })
                        }
                        placeholder={filterPlaceholder}
                        className="min-w-0 flex-1 rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1 text-[12px] font-normal text-[#243147] outline-none focus:border-dx-blue"
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
                const editLink = editHref?.(row);

                const isSelected = selected.includes(row.id);

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      rowDirty && "bg-[#fffdf5]",
                      isSelected && "bg-[#f5f8ff]",
                      href && "hover:bg-[#f8fafc]",
                    )}
                  >
                    {selectable ? (
                      <td className="border-b border-dx-line px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          aria-label={`Seleccionar fila ${row.id}`}
                          className="h-4 w-4 cursor-pointer rounded border-[#cbd8ee] accent-dx-blue"
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => {
                      const key = cellKey(row.id, col.id);
                      const raw = values[col.id] ?? "";
                      const isFocused = focused === key;
                      const editable =
                        editableMode &&
                        col.editable !== false &&
                        (col.isCellEditable?.(row) ?? true);
                      const display = raw
                        ? (col.format?.(raw, row) ?? raw)
                        : (col.placeholder ?? "—");
                      const selectOptions =
                        typeof col.options === "function"
                          ? col.options(row, values)
                          : (col.options ?? []);

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
                          {editable && isFocused && col.editAs === "select" ? (
                            <div
                              className="min-w-[200px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FilteredSelect
                                value={raw}
                                options={selectOptions}
                                onChange={(next) => {
                                  updateCell(row.id, col.id, next, row);
                                  setFocused(null);
                                }}
                                placeholder={col.placeholder ?? "Seleccionar…"}
                                searchPlaceholder="Buscar…"
                              />
                            </div>
                          ) : editable && isFocused ? (
                            <input
                              autoFocus
                              type={
                                col.editAs === "date"
                                  ? "date"
                                  : col.editAs === "time"
                                    ? "time"
                                    : "text"
                              }
                              value={raw}
                              placeholder={col.placeholder}
                              onChange={(e) =>
                                updateCell(
                                  row.id,
                                  col.id,
                                  e.target.value,
                                  row,
                                )
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
                                  "cursor-pointer hover:bg-[#f5f8ff] focus:bg-[#edf4ff] focus:outline-none",
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
                          {editLink ? (
                            <Link
                              href={editLink}
                              title="Editar"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8090a8] hover:bg-[#f5f8ff] hover:text-dx-blue"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          ) : null}
                          {onEdit && !editLink ? (
                            <button
                              type="button"
                              title="Editar"
                              disabled={saving}
                              onClick={() => void onEdit(row.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8090a8] hover:bg-[#f5f8ff] hover:text-dx-blue disabled:opacity-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {href && openAction ? (
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
          {selectable && selected.length > 0
            ? ` · ${selected.length} seleccionado${selected.length === 1 ? "" : "s"}`
            : ""}
          {editableMode
            ? " · clic en una celda para editar"
            : rowHref
              ? " · clic en una fila para abrir"
              : ""}
          {dirty ? " · hay cambios sin guardar" : ""}
        </p>
        {editableMode && dirty ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={discard}
            >
              Descartar
            </Button>
            <Button
              disabled={saving}
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
