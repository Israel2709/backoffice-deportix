"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  createSeason,
  getAdminLeague,
  listAdminSeasons,
} from "@/lib/api/admin-nfl";
import {
  SEASON_STATUS_LABEL,
  seasonLabel,
  type SeasonStatus,
} from "@/lib/api/nfl-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, TextInput, TextSelect } from "@/components/capture/field";

function statusTone(status?: SeasonStatus) {
  if (status === "current") return "green" as const;
  if (status === "upcoming") return "amber" as const;
  if (status === "cancelled") return "red" as const;
  return "gray" as const;
}

export function SeasonsListPanel({ leagueId }: { leagueId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    status: "upcoming" as SeasonStatus,
    start_date: "",
    end_date: "",
  });

  const leagueQuery = useQuery({
    queryKey: ["admin", "nfl", "leagues", leagueId],
    queryFn: () => getAdminLeague(leagueId),
  });
  const seasonsQuery = useQuery({
    queryKey: ["admin", "nfl", "seasons", leagueId],
    queryFn: () => listAdminSeasons(leagueId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSeason({
        league_id: leagueId,
        year: Number(form.year),
        name: form.name.trim() || null,
        status: form.status,
        start_date: form.start_date
          ? new Date(form.start_date).toISOString()
          : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      }),
    onSuccess: () => {
      toast.success("Temporada creada");
      setShowForm(false);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "nfl", "seasons", leagueId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leagueName = leagueQuery.data?.data.name ?? "Competición";
  const seasons = seasonsQuery.data?.data ?? [];
  const active = seasons.filter(
    (s) => s.status === "current" || s.status === "upcoming" || !s.status,
  );
  const historic = seasons.filter(
    (s) => s.status === "finished" || s.status === "cancelled",
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Temporadas</h2>
          <p className="text-sm text-dx-muted">
            Vigentes y próximas primero · {leagueName}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nueva temporada</Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {active.map((season) => (
          <Link
            key={season.id}
            href={`/operacion/football-americano/${leagueId}/${season.id}`}
            className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px] hover:border-[#becae0]"
          >
            <div>
              <div className="font-bold">{seasonLabel(season)}</div>
              <div className="mt-1 text-[13px] text-dx-muted">
                {season.start_date
                  ? new Date(season.start_date).toLocaleDateString()
                  : "Sin inicio"}{" "}
                →{" "}
                {season.end_date
                  ? new Date(season.end_date).toLocaleDateString()
                  : "Sin fin"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge tone={statusTone(season.status)}>
                {SEASON_STATUS_LABEL[season.status ?? "upcoming"]}
              </StatusBadge>
              <span className="text-2xl text-[#8090a8]">→</span>
            </div>
          </Link>
        ))}
        {active.length === 0 ? (
          <p className="text-sm text-dx-muted">
            No hay temporadas vigentes/próximas.
          </p>
        ) : null}
      </div>

      {historic.length > 0 ? (
        <details className="rounded-xl border border-dx-line bg-white p-4">
          <summary className="cursor-pointer font-semibold">
            Consultar temporadas anteriores ({historic.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {historic.map((season) => (
              <Link
                key={season.id}
                href={`/operacion/football-americano/${leagueId}/${season.id}`}
                className="text-sm text-dx-blue underline"
              >
                {seasonLabel(season)} ·{" "}
                {SEASON_STATUS_LABEL[season.status ?? "finished"]}
              </Link>
            ))}
          </div>
        </details>
      ) : null}

      {showForm ? (
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
          <h3 className="text-lg font-semibold">Nueva temporada</h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Temporada 2026"
              />
            </Field>
            <Field label="Año">
              <TextInput
                type="number"
                value={form.year}
                onChange={(e) =>
                  setForm({ ...form, year: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Estado">
              <TextSelect
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as SeasonStatus,
                  })
                }
              >
                <option value="upcoming">Próxima</option>
                <option value="current">Vigente</option>
                <option value="finished">Finalizada</option>
                <option value="cancelled">Cancelada</option>
              </TextSelect>
            </Field>
            <Field label="Fecha inicio">
              <TextInput
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </Field>
            <Field label="Fecha fin">
              <TextInput
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Crear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
