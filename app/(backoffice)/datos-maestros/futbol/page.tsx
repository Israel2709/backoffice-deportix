import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";

export default function FutbolMaestrosPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fútbol" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="Fútbol"
          description="Estructura deportiva y equipos. La temporada se administra en Operación Deportiva."
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClickCard
          href="/datos-maestros/futbol/estructura"
          title="Estructura deportiva"
          description="País / ámbito → competición."
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
        Alta y edición reales vía `/admin/soccer/*`. Logos por URL en esta fase.
      </Note>
    </>
  );
}
