import Link from "next/link";
import { HomeDashboard } from "@/components/home/home-dashboard";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function HomePage() {
  return (
    <>
      <PageHeader crumbs={<Breadcrumbs items={[{ label: "Inicio" }]} />}>
        <Hero
          eyebrow="Back Office"
          title="DeportiX API"
          description="Administración de datos deportivos para el consumo de App QD."
        />
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClickCard
          href="/datos-maestros"
          title="Datos Maestros"
          description="Información estructural y reutilizable que no se repite por temporada."
          cta="Administrar datos maestros →"
        />
        <ClickCard
          href="/operacion"
          title="Operación Deportiva"
          description="Temporadas, participantes, estructura, partidos y resultados."
          cta="Ir a operación →"
        />
      </div>

      <HomeDashboard />

      <p className="mt-6 text-sm text-dx-muted">
        Referencia visual:{" "}
        <Link href="/datos-maestros" className="text-dx-blue underline">
          Datos Maestros
        </Link>{" "}
        y{" "}
        <Link href="/operacion" className="text-dx-blue underline">
          Operación Deportiva
        </Link>
        .
      </p>
    </>
  );
}
