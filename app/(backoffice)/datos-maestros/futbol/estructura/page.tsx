import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { StructureMasterPanel } from "@/components/futbol/structure-master-panel";

export default function FutbolEstructuraPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fútbol", href: "/datos-maestros/futbol" },
              { label: "Estructura" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Fútbol · Estructura"
          title="Estructura deportiva"
          description="País / ámbito y competiciones reutilizables. La temporada se opera aparte."
        />
      </PageHeader>
      <StructureMasterPanel />
    </>
  );
}
