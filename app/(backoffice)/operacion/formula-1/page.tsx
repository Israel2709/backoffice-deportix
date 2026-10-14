import { SeasonsYearsPanel } from "@/components/f1/seasons-years-panel";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function OperacionF1Page() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fórmula 1" },
        ]}
        backLabel="Operación"
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Temporadas"
          description="Selecciona una temporada para ver y operar sus competiciones."
        />
      </PageHeader>
      <SeasonsYearsPanel />
    </>
  );
}
