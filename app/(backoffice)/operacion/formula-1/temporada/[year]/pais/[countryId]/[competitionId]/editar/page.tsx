import { redirect } from "next/navigation";

/** Legacy edit under country. New path is Temporada → Competición → Editar. */
export default async function LegacyEditarCompeticionF1SeasonCountryPage({
  params,
}: {
  params: Promise<{ year: string; countryId: string; competitionId: string }>;
}) {
  const { year, competitionId } = await params;
  redirect(
    `/operacion/formula-1/temporada/${encodeURIComponent(year)}/${encodeURIComponent(competitionId)}/editar`,
  );
}
