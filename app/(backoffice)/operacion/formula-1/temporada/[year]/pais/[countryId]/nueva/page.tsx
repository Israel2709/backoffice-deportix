import { redirect } from "next/navigation";

/** Legacy create under country. New path is Temporada → Nueva. */
export default async function LegacyNuevaCompeticionF1SeasonCountryPage({
  params,
}: {
  params: Promise<{ year: string; countryId: string }>;
}) {
  const { year } = await params;
  redirect(`/operacion/formula-1/temporada/${encodeURIComponent(year)}/nueva`);
}
