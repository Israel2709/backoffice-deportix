import { PlayersMasterPanel } from "@/components/tennis/players-master-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function TenisJugadoresPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Tenis", href: "/datos-maestros/tenis" },
              { label: "Jugadores" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Tenis · Jugadores"
          title="Jugadores"
          description="Catálogo maestro de jugadores."
        />
      </PageHeader>
      <PlayersMasterPanel />
    </>
  );
}
