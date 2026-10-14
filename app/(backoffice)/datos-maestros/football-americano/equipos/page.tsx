import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { TeamsMasterPanel } from "@/components/nfl/teams-master-panel";

export default function NflEquiposPage() {
  return (
    <>
      <PageHeader
        items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              {
                label: "Football Americano",
                href: "/datos-maestros/football-americano",
              },
              { label: "Equipos" },
            ]}
      >
        <Hero
          eyebrow="Datos Maestros · NFL"
          title="Equipos"
          description="El equipo se crea una sola vez y después se asocia a temporadas desde Operación Deportiva."
        />
      </PageHeader>
      <TeamsMasterPanel />
    </>
  );
}
