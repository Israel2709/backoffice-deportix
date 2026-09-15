import Link from "next/link";
import { CompetitionsListPanel } from "@/components/f1/competitions-list-panel";
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
          title="Competiciones"
          description="Selecciona una competición para operar temporadas: Participantes → Calendario → Clasificaciones."
          actions={
            <Link
              href="/operacion/formula-1/nueva"
              className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
            >
              + Nueva competición
            </Link>
          }
        />
      </PageHeader>
      <CompetitionsListPanel />
    </>
  );
}
