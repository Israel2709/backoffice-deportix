"use client";

import { LoadingBlock } from "@/components/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getRace,
  getRaceHighlights,
  listAdminDrivers,
  listAdminF1Teams,
  listF1Participants,
  saveRaceHighlights,
} from "@/lib/api/admin-f1";
import { driverDisplayName } from "@/lib/api/f1-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { Field } from "@/components/capture/field";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";

type HighlightsForm = {
  p1_driver_id: string;
  p2_driver_id: string;
  p3_driver_id: string;
  pole_driver_id: string;
  fastest_driver_id: string;
  winning_team_id: string;
};

const EMPTY_FORM: HighlightsForm = {
  p1_driver_id: "",
  p2_driver_id: "",
  p3_driver_id: "",
  pole_driver_id: "",
  fastest_driver_id: "",
  winning_team_id: "",
};

export function RaceResultsPanel({
  raceId,
  seasonId,
  embedded = false,
  onSaved,
  onCancel,
}: {
  raceId: string;
  seasonId: string;
  /** Compact layout for use inside a modal. */
  embedded?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<HighlightsForm>(EMPTY_FORM);
  const [baseline, setBaseline] = useState(JSON.stringify(EMPTY_FORM));

  const raceQuery = useQuery({
    queryKey: ["admin", "f1", "race", raceId],
    queryFn: () => getRace(raceId),
  });
  const highlightsQuery = useQuery({
    queryKey: ["admin", "f1", "race-highlights", raceId],
    queryFn: () => getRaceHighlights(raceId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "f1", "participants", seasonId],
    queryFn: () => listF1Participants(seasonId),
  });
  const driversQuery = useQuery({
    queryKey: ["admin", "f1", "drivers"],
    queryFn: () => listAdminDrivers(),
  });
  const teamsQuery = useQuery({
    queryKey: ["admin", "f1", "teams"],
    queryFn: listAdminF1Teams,
  });

  const driversById = useMemo(
    () => new Map((driversQuery.data?.data ?? []).map((d) => [d.id, d])),
    [driversQuery.data],
  );
  const participants = participantsQuery.data?.data ?? [];

  const teamIdByDriver = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) map.set(p.driver_id, p.team_id);
    return map;
  }, [participants]);

  const driverOptions = useMemo(
    () =>
      participants.map((p) => {
        const driver = driversById.get(p.driver_id);
        return {
          value: p.driver_id,
          label: driver ? driverDisplayName(driver) : p.driver_id,
        };
      }),
    [participants, driversById],
  );

  const teamOptions = useMemo(() => {
    const ids = [...new Set(participants.map((p) => p.team_id))];
    return ids.map((id) => ({
      value: id,
      label: teamsQuery.data?.data.find((t) => t.id === id)?.name ?? id,
    }));
  }, [participants, teamsQuery.data]);

  const isSprint = raceQuery.data?.data.type === "Sprint";

  useEffect(() => {
    const h = highlightsQuery.data;
    if (!h) return;
    const next: HighlightsForm = {
      p1_driver_id: h.p1_driver_id,
      p2_driver_id: h.p2_driver_id,
      p3_driver_id: h.p3_driver_id,
      pole_driver_id: h.pole_driver_id,
      fastest_driver_id: h.fastest_driver_id,
      winning_team_id:
        h.winning_team_id ||
        (h.p1_driver_id ? teamIdByDriver.get(h.p1_driver_id) ?? "" : ""),
    };
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [highlightsQuery.data, teamIdByDriver]);

  const dirty = JSON.stringify(form) !== baseline;
  useDirtyGuard(dirty && !embedded);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.p1_driver_id) {
        throw new Error("Selecciona al menos el piloto de P1.");
      }
      return saveRaceHighlights(raceId, {
        p1_driver_id: form.p1_driver_id,
        p2_driver_id: form.p2_driver_id || undefined,
        p3_driver_id: form.p3_driver_id || undefined,
        pole_driver_id: form.pole_driver_id || undefined,
        fastest_driver_id: form.fastest_driver_id || undefined,
        winning_team_id: form.winning_team_id || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Resultados guardados");
      setBaseline(JSON.stringify(form));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "race-highlights", raceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "race-results", raceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "starting-grid", raceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "fastest-laps", raceId],
      });
      onSaved?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function patchForm(patch: Partial<HighlightsForm>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (
        patch.p1_driver_id !== undefined &&
        patch.p1_driver_id !== prev.p1_driver_id
      ) {
        next.winning_team_id = teamIdByDriver.get(patch.p1_driver_id) ?? "";
      }
      return next;
    });
  }

  if (
    raceQuery.isLoading ||
    highlightsQuery.isLoading ||
    participantsQuery.isLoading ||
    driversQuery.isLoading ||
    teamsQuery.isLoading
  ) {
    return <LoadingBlock label="Cargando resultados…" />;
  }

  const race = raceQuery.data?.data;

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div>
          <h2 className="text-[21px] font-semibold">
            {race?.name?.trim() || "Resultados de carrera"}
          </h2>
          <p className="text-sm text-dx-muted">
            {race?.race_date
              ? new Date(race.race_date).toLocaleDateString()
              : "Sin fecha"}
          </p>
        </div>
      ) : (
        <p className="text-sm text-dx-muted">
          Completa los mismos datos que se muestran en la tabla de resultados.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <Field label="P1">
          <FilteredSelect
            value={form.p1_driver_id}
            options={driverOptions}
            onChange={(value) => patchForm({ p1_driver_id: value })}
            placeholder="Piloto…"
            searchPlaceholder="Buscar piloto…"
            emptyLabel="Sin participantes"
          />
        </Field>
        <Field label="P2">
          <FilteredSelect
            value={form.p2_driver_id}
            options={driverOptions}
            onChange={(value) => patchForm({ p2_driver_id: value })}
            placeholder="Piloto…"
            searchPlaceholder="Buscar piloto…"
            emptyLabel="Sin participantes"
          />
        </Field>
        <Field label="P3">
          <FilteredSelect
            value={form.p3_driver_id}
            options={driverOptions}
            onChange={(value) => patchForm({ p3_driver_id: value })}
            placeholder="Piloto…"
            searchPlaceholder="Buscar piloto…"
            emptyLabel="Sin participantes"
          />
        </Field>
        <Field label="Fastest lap">
          <FilteredSelect
            value={form.fastest_driver_id}
            options={driverOptions}
            onChange={(value) => patchForm({ fastest_driver_id: value })}
            placeholder="Piloto…"
            searchPlaceholder="Buscar piloto…"
            emptyLabel="Sin participantes"
          />
        </Field>
        <Field label="Race pole position">
          <FilteredSelect
            value={form.pole_driver_id}
            options={driverOptions}
            onChange={(value) => patchForm({ pole_driver_id: value })}
            placeholder="Piloto…"
            searchPlaceholder="Buscar piloto…"
            emptyLabel="Sin participantes"
          />
        </Field>
        <Field label="Winning team">
          <FilteredSelect
            value={form.winning_team_id}
            options={teamOptions}
            onChange={(value) => patchForm({ winning_team_id: value })}
            placeholder="Equipo…"
            searchPlaceholder="Buscar equipo…"
            emptyLabel="Sin constructores"
          />
        </Field>
        {isSprint ? (
          <>
            <Field label="Sprint pole position">
              <FilteredSelect
                value={form.pole_driver_id}
                options={driverOptions}
                onChange={(value) => patchForm({ pole_driver_id: value })}
                placeholder="Piloto…"
                searchPlaceholder="Buscar piloto…"
                emptyLabel="Sin participantes"
              />
            </Field>
            <Field label="Sprint winner">
              <FilteredSelect
                value={form.p1_driver_id}
                options={driverOptions}
                onChange={(value) => patchForm({ p1_driver_id: value })}
                placeholder="Piloto…"
                searchPlaceholder="Buscar piloto…"
                emptyLabel="Sin participantes"
              />
            </Field>
            <Field label="Sprint winning team">
              <FilteredSelect
                value={form.winning_team_id}
                options={teamOptions}
                onChange={(value) => patchForm({ winning_team_id: value })}
                placeholder="Equipo…"
                searchPlaceholder="Buscar equipo…"
                emptyLabel="Sin constructores"
              />
            </Field>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {embedded && onCancel ? (
          <Button
            variant="secondary"
            disabled={saveMutation.isPending}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => setForm(JSON.parse(baseline) as HighlightsForm)}
        >
          Descartar
        </Button>
        <Button
          disabled={!dirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Guardando…" : "Guardar resultados"}
        </Button>
      </div>

      {!embedded ? (
        <Note>
          Todos los campos son pilotos, excepto Winning team / Sprint winning
          team (constructores). Al elegir P1 se sugiere su equipo.
        </Note>
      ) : null}
    </div>
  );
}
