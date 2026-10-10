import { redirect } from "next/navigation";

export default async function LegacyNuevaCompeticionF1SeasonPage({
  params,
}: {
  params: Promise<{ countryId: string; year: string }>;
}) {
  const { year } = await params;
  redirect(`/operacion/formula-1/temporada/${encodeURIComponent(year)}/nueva`);
}
