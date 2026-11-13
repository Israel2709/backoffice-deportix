import { LeagueTypesCatalogPanel } from "@/components/futbol/league-types-catalog-panel";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function FutbolTiposLigaCatalogPage() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Datos Maestros", href: "/datos-maestros" },
          { label: "Fútbol", href: "/datos-maestros/futbol" },
          { label: "Catálogos", href: "/datos-maestros/futbol/catalogos" },
          { label: "Tipos de liga / torneo" },
        ]}
        backLabel="Catálogos"
      >
        <Hero
          eyebrow="Datos Maestros · Fútbol · Catálogos"
          title="Tipos de liga / torneo"
          description="Alta y edición de los valores del campo tipo (league, cup, …)."
        />
      </PageHeader>
      <LeagueTypesCatalogPanel />
    </>
  );
}
