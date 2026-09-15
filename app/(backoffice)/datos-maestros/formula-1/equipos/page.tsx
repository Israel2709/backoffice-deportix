import { TeamsMasterPanel } from "@/components/f1/teams-master-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function F1EquiposPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fórmula 1", href: "/datos-maestros/formula-1" },
              { label: "Equipos" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="F1 · Equipos"
          title="Equipos"
          description="Catálogo maestro de escuderías."
        />
      </PageHeader>
      <TeamsMasterPanel />
    </>
  );
}
