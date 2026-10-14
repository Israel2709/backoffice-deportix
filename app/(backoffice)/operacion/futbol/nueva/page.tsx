import Link from "next/link";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
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
        backLabel="Temporadas"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Nueva competición"
          description="La competición pertenece a una temporada y organización ya seleccionadas."
          actions={
            <Link
              href="/operacion/futbol"
              className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
            >
              Elegir temporada
            </Link>
          }
        />
      </PageHeader>
      <Note>
        Elige una temporada y luego una organización. Desde ahí se abre el
        formulario, con temporada y organización fijas; el país se infiere de la
        organización.
      </Note>
    </>
  );
}
