import { EditionsListPanel } from "@/components/tennis/editions-list-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function OperacionTenisPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Tenis" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Tenis"
          title="Ediciones"
          description="Torneos y ediciones: Participantes → Draw → Partidos → Publicación."
        />
      </PageHeader>
      <EditionsListPanel />
    </>
  );
}
