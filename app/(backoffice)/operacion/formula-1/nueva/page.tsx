import Link from "next/link";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";

export default function NuevaCompeticionF1Page() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fórmula 1", href: "/operacion/formula-1" },
          { label: "Nueva competición" },
        ]}
        backLabel="Temporadas"
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Nueva competición"
          description="La competición pertenece a una temporada ya seleccionada."
          actions={
            <Link
              href="/operacion/formula-1"
              className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
            >
              Elegir temporada
            </Link>
          }
        />
      </PageHeader>
      <Note>
        Elige una temporada. Desde ahí se abre el formulario, con la temporada
        fija.
      </Note>
    </>
  );
}
