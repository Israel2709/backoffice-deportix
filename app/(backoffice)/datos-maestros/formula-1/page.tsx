import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader, Section } from "@/components/ui/page";
import { EntityList } from "@/components/data/entity-list";

export default function F1MaestrosPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fórmula 1" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Datos Maestros · Fórmula 1"
          title="Fórmula 1"
          description="Circuitos, equipos y pilotos. La relación piloto–equipo es por temporada (Operación)."
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ClickCard
          href="/datos-maestros/formula-1/circuitos"
          title="Circuitos"
          description="Nombre, país e imagen."
        />
        <ClickCard
          href="/datos-maestros/formula-1/equipos"
          title="Equipos"
          description="Escuderías reutilizables."
        />
        <ClickCard
          href="/datos-maestros/formula-1/pilotos"
          title="Pilotos"
          description="Nombre, número, país y foto."
        />
      </div>

      <Section title="Vista rápida (lectura API)">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <EntityList source="f1-circuits" />
          <EntityList source="f1-teams" />
          <EntityList source="f1-drivers" />
        </div>
      </Section>

      <Note>CRUD de maestros F1 en fases posteriores.</Note>
    </>
  );
}
