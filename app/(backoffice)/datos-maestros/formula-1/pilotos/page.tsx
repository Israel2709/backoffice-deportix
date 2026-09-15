import { DriversMasterPanel } from "@/components/f1/drivers-master-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function F1PilotosPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fórmula 1", href: "/datos-maestros/formula-1" },
              { label: "Pilotos" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="F1 · Pilotos"
          title="Pilotos"
          description="Catálogo maestro de pilotos."
        />
      </PageHeader>
      <DriversMasterPanel />
    </>
  );
}
