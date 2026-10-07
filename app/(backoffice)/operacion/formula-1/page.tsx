import { CountriesListPanel } from "@/components/f1/countries-list-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function OperacionF1Page() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Países"
          description="Selecciona un país de datos maestros para operar por temporada y competición."
        />
      </PageHeader>
      <CountriesListPanel />
    </>
  );
}
