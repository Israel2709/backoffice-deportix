import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { StructureMasterPanel } from "@/components/nfl/structure-master-panel";

export default function NflEstructuraPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              {
                label: "Football Americano",
                href: "/datos-maestros/football-americano",
              },
              { label: "Estructura" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="NFL · Estructura"
          title="Estructura deportiva"
          description="País / ámbito y competiciones reutilizables. La temporada se opera aparte."
        />
      </PageHeader>
      <StructureMasterPanel />
    </>
  );
}
