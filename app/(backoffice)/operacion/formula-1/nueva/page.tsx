import { CreateCompetitionPanel } from "@/components/f1/create-competition-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function NuevaCompeticionF1Page() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1", href: "/operacion/formula-1" },
              { label: "Nueva competición" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Nueva competición"
          description="Define la competición. Después podrás crear y operar sus temporadas."
        />
      </PageHeader>

      <CreateCompetitionPanel />
    </>
  );
}
