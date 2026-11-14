import { Suspense } from "react";
import { CreateTeamPanel } from "@/components/futbol/create-team-panel";
import { LoadingBlock } from "@/components/ui/spinner";

export default function FutbolEquiposNuevoPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Cargando…" />}>
      <CreateTeamPanel />
    </Suspense>
  );
}
