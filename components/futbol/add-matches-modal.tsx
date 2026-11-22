"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveMatchesBatch } from "@/lib/api/admin-soccer";
import {
  MATCH_STATUS_LABEL,
  teamCode,
  teamDisplayName,
  type MatchBoStatus,
  type SoccerTeam,
} from "@/lib/api/soccer-types";
import { syncStandingsGoalsFromMatches } from "@/lib/soccer/sync-standings-goals";
import { Button } from "@/components/ui/button";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { cn } from "@/lib/utils";
import { combineUtcDateTime } from "@/lib/format-date";

type RoundOption = {
  id: string;
  name: string;
  phase?: string | null;
};

type DraftMatch = {
  key: string;
  home_team_id: string;
  away_team_id: string;
  home_label: string;
  away_label: string;
  date: string;
  time: string;
  status: MatchBoStatus;
  goals_home: string;
  goals_away: string;
  round_id: string;
  round_name: string;
};

type FormState = {
  date: string;
  time: string;
  home_team_id: string;
  away_team_id: string;
  goals_home: string;
  goals_away: string;
  status: MatchBoStatus;
  round_id: string;
};

const inputClass =
  "w-full min-w-0 rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-[13px] text-[#243147]";

function emptyForm(defaultRoundId: string): FormState {
  return {
    date: "",
    time: "",
    home_team_id: "",
    away_team_id: "",
    goals_home: "",
    goals_away: "",
    status: "scheduled",
    round_id: defaultRoundId,
  };
}

/** Both scores filled (incl. 0) → status Finalizado. */
function hasCompleteScore(goalsHome: string, goalsAway: string): boolean {
  const home = goalsHome.trim();
  const away = goalsAway.trim();
  if (home === "" || away === "") return false;
  return Number.isFinite(Number(home)) && Number.isFinite(Number(away));
}

function withAutoFinishedStatus<
  T extends { goals_home: string; goals_away: string; status: MatchBoStatus },
>(row: T): T {
  if (!hasCompleteScore(row.goals_home, row.goals_away)) return row;
  if (row.status === "finished") return row;
  return { ...row, status: "finished" };
}

export function AddMatchesModal({
  open,
  onClose,
  seasonId,
  rounds,
  participantTeams,
  teamsById,
  defaultRoundId = "",
}: {
  open: boolean;
  onClose: () => void;
  seasonId: string;
  rounds: RoundOption[];
  participantTeams: SoccerTeam[];
  teamsById: Map<string, SoccerTeam>;
  defaultRoundId?: string;
}) {
  const titleId = useId();
  const queryClient = useQueryClient();
  const resolvedDefaultRound =
    defaultRoundId || rounds[0]?.id || "";

  const [form, setForm] = useState<FormState>(() =>
    emptyForm(resolvedDefaultRound),
  );
  const [preview, setPreview] = useState<DraftMatch[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const roundsById = useMemo(() => {
    const map = new Map<string, RoundOption>();
    for (const round of rounds) map.set(round.id, round);
    return map;
  }, [rounds]);

  const saveMutation = useMutation({
    mutationFn: async (rows: DraftMatch[]) => {
      if (rows.length === 0) {
        throw new Error("Agrega al menos un partido antes de guardar.");
      }
      for (const row of rows) {
        if (!row.home_team_id?.trim() || !row.away_team_id?.trim()) {
          throw new Error(
            "Hay partidos sin local o visitante. Elige ambos equipos antes de guardar.",
          );
        }
        if (row.home_team_id === row.away_team_id) {
          throw new Error("Local y visitante deben ser equipos distintos.");
        }
      }
      const saved = await saveMatchesBatch(
        seasonId,
        rows.map((row) => {
          const home = teamsById.get(row.home_team_id);
          const away = teamsById.get(row.away_team_id);
          return {
            home_team_id: row.home_team_id,
            away_team_id: row.away_team_id,
            home_name: home ? teamDisplayName(home) : row.home_label || null,
            away_name: away ? teamDisplayName(away) : row.away_label || null,
            fixture_date: combineUtcDateTime(row.date, row.time),
            status: row.status,
            goals_home:
              row.goals_home === "" ? null : Number(row.goals_home),
            goals_away:
              row.goals_away === "" ? null : Number(row.goals_away),
            round_id: row.round_id || null,
            round_name: row.round_name || null,
          };
        }),
      );
      await syncStandingsGoalsFromMatches(seasonId);
      return saved;
    },
    onSuccess: (_data, rows) => {
      toast.success(
        rows.length === 1
          ? "Partido guardado"
          : `${rows.length} partidos guardados`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "matches", seasonId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "standings", seasonId],
      });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(resolvedDefaultRound));
    setPreview([]);
    setFormError(null);
  }, [open, resolvedDefaultRound]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saveMutation.isPending) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, saveMutation.isPending, onClose]);
  function updateForm(patch: Partial<FormState>) {
    setForm((prev) => withAutoFinishedStatus({ ...prev, ...patch }));
    setFormError(null);
  }

  function updatePreview(key: string, patch: Partial<DraftMatch>) {
    setPreview((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        let next = { ...row, ...patch };
        if (patch.round_id !== undefined) {
          const round = roundsById.get(patch.round_id);
          next.round_name = round?.name ?? "";
        }
        if (patch.home_team_id !== undefined) {
          const home = teamsById.get(patch.home_team_id);
          next.home_label = home ? teamDisplayName(home) : patch.home_team_id;
        }
        if (patch.away_team_id !== undefined) {
          const away = teamsById.get(patch.away_team_id);
          next.away_label = away ? teamDisplayName(away) : patch.away_team_id;
        }
        next = withAutoFinishedStatus(next);
        return next;
      }),
    );
  }

  function removePreview(key: string) {
    setPreview((prev) => prev.filter((row) => row.key !== key));
  }

  function addToPreview() {
    if (!form.home_team_id.trim() || !form.away_team_id.trim()) {
      setFormError("Elige local y visitante.");
      return;
    }
    if (form.home_team_id === form.away_team_id) {
      setFormError("Local y visitante deben ser equipos distintos.");
      return;
    }
    const round = roundsById.get(form.round_id);
    const home = teamsById.get(form.home_team_id);
    const away = teamsById.get(form.away_team_id);
    const draft = withAutoFinishedStatus({
      key: `draft-${Date.now()}-${preview.length}`,
      home_team_id: form.home_team_id,
      away_team_id: form.away_team_id,
      home_label: home ? teamDisplayName(home) : form.home_team_id,
      away_label: away ? teamDisplayName(away) : form.away_team_id,
      date: form.date,
      time: form.time,
      status: form.status,
      goals_home: form.goals_home,
      goals_away: form.goals_away,
      round_id: form.round_id,
      round_name: round?.name ?? "",
    });
    setPreview((prev) => [...prev, draft]);
    setForm((prev) => ({
      ...emptyForm(prev.round_id || resolvedDefaultRound),
      // Keep jornada/date for faster consecutive entry; status resets
      // to Programado until the next marcador completo.
      round_id: prev.round_id || resolvedDefaultRound,
      date: prev.date,
    }));
    setFormError(null);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-[#0f1c33]/45 backdrop-blur-[1px]"
        disabled={saveMutation.isPending}
        onClick={() => {
          if (!saveMutation.isPending) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex max-h-[min(920px,92vh)] w-full max-w-[1100px] flex-col overflow-hidden rounded-[18px] border border-dx-line bg-white shadow-[0_18px_50px_rgba(15,28,51,0.22)]"
      >
        <div className="border-b border-dx-line px-6 py-4">
          <h2
            id={titleId}
            className="text-[18px] font-semibold leading-snug text-dx-ink"
          >
            Agregar partidos
          </h2>
          <p className="mt-1 text-[13px] text-dx-muted">
            Completa los datos, agrégalos a la lista y guarda el lote. Con
            marcador de ambos equipos el estado pasa a Finalizado.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Jornada">
              <TextSelect
                value={form.round_id}
                onChange={(e) => updateForm({ round_id: e.target.value })}
              >
                <option value="">Sin jornada</option>
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.phase ? `${round.phase} · ` : ""}
                    {round.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Fecha">
              <TextInput
                type="date"
                value={form.date}
                onChange={(e) => updateForm({ date: e.target.value })}
              />
            </Field>
            <Field label="Hora">
              <TextInput
                type="time"
                value={form.time}
                onChange={(e) => updateForm({ time: e.target.value })}
              />
            </Field>
            <Field label="Estado">
              <TextSelect
                value={form.status}
                onChange={(e) =>
                  updateForm({ status: e.target.value as MatchBoStatus })
                }
              >
                {(Object.keys(MATCH_STATUS_LABEL) as MatchBoStatus[]).map(
                  (status) => (
                    <option key={status} value={status}>
                      {MATCH_STATUS_LABEL[status]}
                    </option>
                  ),
                )}
              </TextSelect>
            </Field>
            <Field label="Local">
              <TextSelect
                value={form.home_team_id}
                onChange={(e) => updateForm({ home_team_id: e.target.value })}
              >
                <option value="">Selecciona local…</option>
                {participantTeams
                  .filter((team) => team.id !== form.away_team_id)
                  .map((team) => (
                    <option key={`form-h-${team.id}`} value={team.id}>
                      {teamDisplayName(team)}
                    </option>
                  ))}
              </TextSelect>
            </Field>
            <Field label="Goles local">
              <TextInput
                inputMode="numeric"
                value={form.goals_home}
                onChange={(e) => updateForm({ goals_home: e.target.value })}
              />
            </Field>
            <Field label="Goles visitante">
              <TextInput
                inputMode="numeric"
                value={form.goals_away}
                onChange={(e) => updateForm({ goals_away: e.target.value })}
              />
            </Field>
            <Field label="Visitante">
              <TextSelect
                value={form.away_team_id}
                onChange={(e) => updateForm({ away_team_id: e.target.value })}
              >
                <option value="">Selecciona visitante…</option>
                {participantTeams
                  .filter((team) => team.id !== form.home_team_id)
                  .map((team) => (
                    <option key={`form-a-${team.id}`} value={team.id}>
                      {teamDisplayName(team)}
                    </option>
                  ))}
              </TextSelect>
            </Field>
          </div>

          {formError ? (
            <p className="rounded-[10px] bg-[#fff1f0] px-3 py-2 text-sm text-[#b42318]">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={addToPreview}>
              + Agregar a la lista
            </Button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <strong className="text-[14px] text-dx-ink">
                Vista previa
              </strong>
              <span className="text-[12px] text-dx-muted">
                {preview.length} partido{preview.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
              <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-[13px]">
                <thead>
                  <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Jornada
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Fecha
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Hora
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Logo L
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Local
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Goles L
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Goles V
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5 text-right">
                      Visitante
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Logo V
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5">
                      Estado
                    </th>
                    <th className="border-b border-dx-line px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {preview.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-3 py-8 text-center text-[13px] text-dx-muted"
                      >
                        Aún no hay partidos en la lista. Completa el formulario
                        y pulsa «Agregar a la lista».
                      </td>
                    </tr>
                  ) : (
                    preview.map((row) => {
                      const home = teamsById.get(row.home_team_id);
                      const away = teamsById.get(row.away_team_id);
                      return (
                        <tr key={row.key} className="hover:bg-[#fbfdff]">
                          <td className="border-b border-dx-line px-2 py-1.5 min-w-[140px]">
                            <select
                              className={inputClass}
                              value={row.round_id}
                              onChange={(e) =>
                                updatePreview(row.key, {
                                  round_id: e.target.value,
                                })
                              }
                            >
                              <option value="">Sin jornada</option>
                              {rounds.map((round) => (
                                <option key={round.id} value={round.id}>
                                  {round.phase ? `${round.phase} · ` : ""}
                                  {round.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5">
                            <input
                              type="date"
                              className={cn(inputClass, "w-[112px]")}
                              value={row.date}
                              onChange={(e) =>
                                updatePreview(row.key, {
                                  date: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5">
                            <input
                              type="time"
                              className={cn(inputClass, "w-[82px]")}
                              value={row.time}
                              onChange={(e) =>
                                updatePreview(row.key, {
                                  time: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-dx-line text-[10px] font-black text-dx-blue">
                              {home ? teamCode(home).slice(0, 3) : "—"}
                            </div>
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5 min-w-[170px]">
                            <select
                              className={inputClass}
                              value={row.home_team_id}
                              onChange={(e) =>
                                updatePreview(row.key, {
                                  home_team_id: e.target.value,
                                })
                              }
                            >
                              {participantTeams
                                .filter((team) => team.id !== row.away_team_id)
                                .map((team) => (
                                  <option
                                    key={`h-${row.key}-${team.id}`}
                                    value={team.id}
                                  >
                                    {teamDisplayName(team)}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5">
                            <input
                              className={cn(inputClass, "w-[58px] text-center")}
                              inputMode="numeric"
                              value={row.goals_home}
                              onChange={(e) =>
                                updatePreview(row.key, {
                                  goals_home: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5">
                            <input
                              className={cn(inputClass, "w-[58px] text-center")}
                              inputMode="numeric"
                              value={row.goals_away}
                              onChange={(e) =>
                                updatePreview(row.key, {
                                  goals_away: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5 min-w-[170px] text-right">
                            <select
                              className={inputClass}
                              value={row.away_team_id}
                              onChange={(e) =>
                                updatePreview(row.key, {
                                  away_team_id: e.target.value,
                                })
                              }
                            >
                              {participantTeams
                                .filter((team) => team.id !== row.home_team_id)
                                .map((team) => (
                                  <option
                                    key={`a-${row.key}-${team.id}`}
                                    value={team.id}
                                  >
                                    {teamDisplayName(team)}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-dx-line text-[10px] font-black text-dx-blue">
                              {away ? teamCode(away).slice(0, 3) : "—"}
                            </div>
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5">
                            <select
                              className={cn(inputClass, "min-w-[112px]")}
                              value={row.status}
                              onChange={(e) =>
                                updatePreview(row.key, {
                                  status: e.target.value as MatchBoStatus,
                                })
                              }
                            >
                              {(
                                Object.keys(
                                  MATCH_STATUS_LABEL,
                                ) as MatchBoStatus[]
                              ).map((status) => (
                                <option key={status} value={status}>
                                  {MATCH_STATUS_LABEL[status]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="border-b border-dx-line px-2 py-1.5">
                            <button
                              type="button"
                              title="Eliminar"
                              aria-label="Eliminar partido de la lista"
                              className="rounded-[7px] border border-dx-line p-1.5 text-[#64748b] hover:bg-[#fff1f0] hover:text-[#b42318]"
                              onClick={() => removePreview(row.key)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-dx-line px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            disabled={saveMutation.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saveMutation.isPending || preview.length === 0}
            onClick={() => saveMutation.mutate(preview)}
          >
            {saveMutation.isPending ? "Guardando…" : "Guardar partidos"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
