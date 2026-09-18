import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { EquiposCountryPanel } from "@/components/futbol/equipos-scope-panels";

export default function FutbolEquiposPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fútbol", href: "/datos-maestros/futbol" },
              { label: "Equipos" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="País o ámbito"
          description="Selecciona un país para ver sus organizaciones deportivas y, después, las ligas y equipos."
        />
      </PageHeader>
      <EquiposCountryPanel />
    </>
  );
}
