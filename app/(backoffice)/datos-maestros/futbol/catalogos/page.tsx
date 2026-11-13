import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";

export default function FutbolCatalogosPage() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Datos Maestros", href: "/datos-maestros" },
          { label: "Fútbol", href: "/datos-maestros/futbol" },
          { label: "Catálogos" },
        ]}
        backLabel="Fútbol"
      >
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="Catálogos"
          description="Valores reutilizables del deporte (tipos de liga, etc.). No incluye países."
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ClickCard
          href="/datos-maestros/futbol/catalogos/tipos-liga"
          title="Tipos de liga / torneo"
          description="League, Cup y los que agregues. Se usan al editar competiciones."
          cta="Administrar →"
        />
      </div>

      <Note>
        Los cambios aquí se reflejan en los selectores de Ligas / torneos y
        Estructura. El catálogo de países se administra aparte (poco frecuente).
      </Note>
    </>
  );
}
