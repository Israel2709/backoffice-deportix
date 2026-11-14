import { Suspense } from "react";
import { EquiposMasterPanel } from "@/components/futbol/equipos-master-panel";
import { LoadingBlock } from "@/components/ui/spinner";

export default function FutbolEquiposPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Cargando…" />}>
      <EquiposMasterPanel />
    </Suspense>
  );
}
