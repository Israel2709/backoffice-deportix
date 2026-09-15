import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ClickCard } from "@/components/ui/click-card";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function OperacionPage() {
  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs items={[{ label: "Operación Deportiva" }]} />
        }
      >
        <Hero
          eyebrow="Operación Deportiva"
          title="Selecciona un deporte"
          description="La operación prioriza información vigente, próxima o pendiente de trabajo. El histórico queda disponible bajo consulta."
        />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClickCard
          href="/operacion/futbol"
          icon="⚽"
          title="Fútbol"
          description="Temporadas, participantes, estructura, partidos y resultados."
        />
        <ClickCard
          href="/operacion/football-americano"
          icon="🏈"
          title="Football Americano"
          description="Temporada, semanas, playoffs y partidos."
        />
        <ClickCard
          href="/operacion/formula-1"
          icon="🏎️"
          title="Fórmula 1"
          description="Temporada, calendario, sesiones, resultados y clasificaciones."
        />
        <ClickCard
          href="/operacion/tenis"
          icon="🎾"
          title="Tenis"
          description="Ediciones, participantes, draw, partidos y publicación."
        />
      </div>
    </>
  );
}
