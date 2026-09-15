import { EntityList } from "@/components/data/entity-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader, Section } from "@/components/ui/page";

export default function NflMaestrosPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Football Americano" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Datos Maestros · Football Americano"
          title="Football Americano"
          description="Para el alcance actual: Estados Unidos → NFL. Conferencia y división no van en el maestro del equipo."
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClickCard
          href="/datos-maestros/football-americano/estructura"
          title="Estructura deportiva"
          description="Ámbito y organización (NFL)."
        />
        <ClickCard
          href="/datos-maestros/football-americano/equipos"
          title="Equipos"
          description="Catálogo de equipos NFL."
        />
      </div>

      <Section title="Ligas NFL (lectura API)">
        <EntityList source="leagues-nfl" />
      </Section>

      <Section title="Equipos (vista rápida)">
        <EntityList source="nfl-teams" />
      </Section>

      <Note>Captura/edición de maestros NFL en fases posteriores.</Note>
    </>
  );
}
