import { CreateCompetitionPanel } from "@/components/futbol/create-competition-panel";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function NuevaCompeticionFutbolPage() {
  return (
    <>
      <PageHeader
        items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fútbol", href: "/operacion/futbol" },
              { label: "Nueva competición" },
            ]}
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Nueva competición"
          description="Define la competición. Después podrás crear y operar sus temporadas."
        />
      </PageHeader>

      <CreateCompetitionPanel />
    </>
  );
}
