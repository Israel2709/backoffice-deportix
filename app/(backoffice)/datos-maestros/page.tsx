import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function DatosMaestrosPage() {
  return (
    <>
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: "Datos Maestros" }]} />}
      >
        <Hero
          eyebrow="Datos Maestros"
          title="Selecciona un deporte"
          description="Información estructural y reutilizable que normalmente no debe recapturarse por temporada."
        />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClickCard
          href="/datos-maestros/futbol"
          icon="⚽"
          title="Fútbol"
          description="Estructura deportiva y equipos."
        />
        <ClickCard
          href="/datos-maestros/football-americano"
          icon="🏈"
          title="Football Americano"
          description="Estructura deportiva y equipos."
        />
        <ClickCard
          href="/datos-maestros/formula-1"
          icon="🏎️"
          title="Fórmula 1"
          description="Estructura, circuitos, equipos y pilotos."
        />
        <ClickCard
          href="/datos-maestros/tenis"
          icon="🎾"
          title="Tenis"
          description="Estructura deportiva y jugadores."
        />
      </div>
    </>
  );
}
