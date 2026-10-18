import { redirect } from "next/navigation";

/** Legacy create-under-year route → create under org. */
export default async function LegacyNuevaLigaRedirect({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  redirect(
    `/operacion/futbol/organizacion/${encodeURIComponent(orgId)}/nueva`,
  );
}
