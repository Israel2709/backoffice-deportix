import { redirect } from "next/navigation";

/** Legacy País → Temporada. New path is Temporada → Competiciones. */
export default async function LegacyOperacionF1CountrySeasonPage({
  params,
}: {
  params: Promise<{ countryId: string; year: string }>;
}) {
  const { year } = await params;
  redirect(`/operacion/formula-1/temporada/${encodeURIComponent(year)}`);
}
