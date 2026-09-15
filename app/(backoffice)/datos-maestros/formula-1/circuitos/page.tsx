import { CircuitsMasterPanel } from "@/components/f1/circuits-master-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function F1CircuitosPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fórmula 1", href: "/datos-maestros/formula-1" },
              { label: "Circuitos" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="F1 · Circuitos"
          title="Circuitos"
          description="Catálogo maestro de circuitos."
        />
      </PageHeader>
      <CircuitsMasterPanel />
    </>
  );
}
