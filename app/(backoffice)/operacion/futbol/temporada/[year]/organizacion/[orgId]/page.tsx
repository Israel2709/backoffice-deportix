import { redirect } from "next/navigation";

/** Legacy year → org route → org ligas. */
export default async function LegacyFutbolOrgRedirect({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(`/operacion/futbol/organizacion/${encodeURIComponent(orgId)}`);
}
