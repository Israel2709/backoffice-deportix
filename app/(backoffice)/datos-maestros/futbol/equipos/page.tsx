import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { TeamsMasterPanel } from "@/components/futbol/teams-master-panel";

export default function FutbolEquiposPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fútbol", href: "/datos-maestros/futbol" },
              { label: "Equipos" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="Equipos"
          description="El equipo se crea una sola vez y después se asocia a temporadas desde Operación Deportiva."
        />
      </PageHeader>
      <TeamsMasterPanel />
    </>
  );
}
