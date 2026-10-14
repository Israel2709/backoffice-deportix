import { OrganizationsMasterPanel } from "@/components/futbol/organizations-master-panel";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function FutbolOrganizacionesMaestrosPage() {
  return (
    <>
      <PageHeader
        items={[
          { label: "Datos Maestros", href: "/datos-maestros" },
          { label: "Fútbol", href: "/datos-maestros/futbol" },
          { label: "Organizaciones" },
        ]}
        backLabel="Fútbol"
      >
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="Organizaciones deportivas"
          description="Catálogo de federaciones y organizadores. Las competiciones se asocian a una organización; el país se infiere de ella."
        />
      </PageHeader>
      <OrganizationsMasterPanel />
    </>
  );
}
