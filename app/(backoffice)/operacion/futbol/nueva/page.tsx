import Link from "next/link";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";

export default function NuevaLigaFutbolPage() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol", href: "/operacion/futbol" },
          { label: "Nueva liga" },
        ]}
        backLabel="Organizaciones"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Nueva liga"
          description="La liga pertenece a una organización ya seleccionada."
          actions={
            <Link
              href="/operacion/futbol"
              className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
            >
              Elegir organización
            </Link>
          }
        />
      </PageHeader>
      <Note>
        Elige una organización deportiva. Desde ahí se abre el formulario con
        la organización fija; el país se infiere de ella. Luego crearás
        temporadas de la liga.
      </Note>
    </>
  );
}
