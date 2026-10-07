"use client";

import { CompetitionForm } from "@/components/f1/competition-form";

export function CreateCompetitionPanel({
  seasonId,
  countryId,
  year,
  competitionId,
}: {
  seasonId: string;
  countryId?: string;
  year?: number;
  competitionId?: string;
}) {
  return (
    <CompetitionForm
      seasonId={seasonId}
      countryId={countryId}
      year={year}
      competitionId={competitionId}
    />
  );
}
