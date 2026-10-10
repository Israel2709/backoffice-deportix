import { redirect } from "next/navigation";

/** Legacy Temporada → País. Competitions are listed per season. */
export default async function LegacyOperacionF1SeasonCountryPage({
  params,
}: {
  params: Promise<{ year: string; countryId: string }>;
}) {
  const { year } = await params;
  redirect(`/operacion/formula-1/temporada/${encodeURIComponent(year)}`);
}
