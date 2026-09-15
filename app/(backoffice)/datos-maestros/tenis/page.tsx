import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { Note } from "@/components/ui/note";

export default function TenisMaestrosPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Tenis" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Datos Maestros · Tenis"
          title="Tenis"
          description="Jugadores como catálogo maestro para ediciones de torneo."
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClickCard
          href="/datos-maestros/tenis/jugadores"
          title="Jugadores"
          description="Nombre, país, foto y estado."
        />
      </div>

      <Note>
        Las ediciones y el draw se operan en Operación Deportiva · Tenis.
      </Note>
    </>
  );
}
