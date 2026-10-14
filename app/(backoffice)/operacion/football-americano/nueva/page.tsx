import { CreateCompetitionPanel } from "@/components/nfl/create-competition-panel";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function NuevaCompeticionNflPage() {
  return (
    <>
      <PageHeader
        items={[
              { label: "Operación Deportiva", href: "/operacion" },
              {
                label: "Football Americano",
                href: "/operacion/football-americano",
              },
              { label: "Nueva competición" },
            ]}
      >
        <Hero
          eyebrow="Operación · NFL"
          title="Nueva competición"
          description="Define la competición. Después podrás crear y operar sus temporadas."
        />
      </PageHeader>

      <CreateCompetitionPanel />
    </>
  );
}
