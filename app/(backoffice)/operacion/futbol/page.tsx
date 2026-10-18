"use client";

import { OrganizationsListPanel } from "@/components/futbol/organizations-list-panel";
import {
  SOCCER_ORG_RECENT_KEY,
  SOCCER_ORG_RECENT_MAX,
} from "@/components/futbol/recent-keys";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";
import { RecentlyVisited } from "@/components/ui/recently-visited";
import { useRecentVisits } from "@/hooks/use-recent-visits";

export default function OperacionFutbolPage() {
  const { items: recentOrgs } = useRecentVisits(
    SOCCER_ORG_RECENT_KEY,
    SOCCER_ORG_RECENT_MAX,
  );

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol" },
        ]}
        backLabel="Operación"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Organizaciones deportivas"
          description="Primer paso: elige la organización. Después liga → temporada → detalle de la competición."
        />
      </PageHeader>
      {recentOrgs.length > 0 ? (
        <div className="mb-4">
          <RecentlyVisited items={recentOrgs} className="flex" />
        </div>
      ) : null}
      <OrganizationsListPanel />
    </>
  );
}
