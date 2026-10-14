import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";

export default function FutbolMaestrosPage() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Datos Maestros", href: "/datos-maestros" },
          { label: "Fútbol" },
        ]}
      >
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="Fútbol"
          description="Organizaciones, estructura deportiva y equipos. La temporada se administra en Operación Deportiva."
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ClickCard
          href="/datos-maestros/futbol/organizaciones"
          title="Organizaciones deportivas"
          description="Federaciones y organizadores: nombre, país y logos."
          cta="Administrar →"
        />
        <ClickCard
          href="/datos-maestros/futbol/estructura"
          title="Estructura deportiva"
          description="Países y competiciones asociadas a una organización."
          cta="Administrar →"
        />
        <ClickCard
          href="/datos-maestros/futbol/equipos"
          title="Equipos"
          description="País → organización → liga → equipos."
          cta="Administrar →"
        />
      </div>

      <Note>
        Flujo maestro: Organización → Competición → Equipos. Logos por URL o
        archivo.
      </Note>
    </>
  );
}
