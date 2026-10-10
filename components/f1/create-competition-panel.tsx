"use client";

import { CompetitionForm } from "@/components/f1/competition-form";

export function CreateCompetitionPanel({
  seasonId,
  countryId,
  countryName,
  year,
  competitionId,
}: {
  seasonId: string;
  countryId?: string;
  countryName?: string;
  year?: number;
  competitionId?: string;
}) {
  return (
    <CompetitionForm
      seasonId={seasonId}
      countryId={countryId}
      countryName={countryName}
      year={year}
      competitionId={competitionId}
    />
  );
}
