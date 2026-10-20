import { TournamentsMasterPanel } from "@/components/tennis/tournaments-master-panel";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";

export default function TenisTorneosPage() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Datos Maestros", href: "/datos-maestros" },
          { label: "Tenis", href: "/datos-maestros/tenis" },
          { label: "Torneos" },
        ]}
      >
        <Hero
          eyebrow="Tenis · Torneos"
          title="Torneos"
          description="Alta de torneos (ediciones) con categoría, sede y calendario."
        />
      </PageHeader>
      <TournamentsMasterPanel />
    </>
  );
}
