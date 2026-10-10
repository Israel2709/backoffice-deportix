import { redirect } from "next/navigation";

export default async function LegacyEditarCompeticionF1SeasonPage({
  params,
}: {
  params: Promise<{ countryId: string; year: string; competitionId: string }>;
}) {
  const { year, competitionId } = await params;
  redirect(
    `/operacion/formula-1/temporada/${encodeURIComponent(year)}/${encodeURIComponent(competitionId)}/editar`,
  );
}
