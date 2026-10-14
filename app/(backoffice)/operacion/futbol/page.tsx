import { SeasonsYearsPanel } from "@/components/futbol/seasons-years-panel";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function OperacionFutbolPage() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol" },
        ]}
        backLabel="Operación"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Selecciona una temporada"
          description="Primer paso de la operación: elige el año. Después verás organizaciones, competiciones y partidos."
        />
      </PageHeader>
      <SeasonsYearsPanel />
    </>
  );
}
