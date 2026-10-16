"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingBlock } from "@/components/ui/spinner";
import { normalizeSeasonIdParam, parseSeasonId } from "@/lib/api/f1-types";

/** Championship standings moved to year-level tabs. */
export default function F1SeasonClasificacionesRedirect({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId: seasonIdParam } = use(params);
  const router = useRouter();

  useEffect(() => {
    try {
      const seasonId = normalizeSeasonIdParam(seasonIdParam);
      const { year } = parseSeasonId(seasonId);
      router.replace(
        `/operacion/formula-1/temporada/${year}/clasificacion-pilotos`,
      );
    } catch {
      router.replace("/operacion/formula-1");
    }
  }, [router, seasonIdParam]);

  return <LoadingBlock label="Redirigiendo a clasificación de temporada…" />;
}
