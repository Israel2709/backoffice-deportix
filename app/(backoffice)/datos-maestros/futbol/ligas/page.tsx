import { Suspense } from "react";
import { LeaguesMasterPanel } from "@/components/futbol/leagues-master-panel";
import { LoadingBlock } from "@/components/ui/spinner";

export default function FutbolLigasPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Cargando…" />}>
      <LeaguesMasterPanel />
    </Suspense>
  );
}
