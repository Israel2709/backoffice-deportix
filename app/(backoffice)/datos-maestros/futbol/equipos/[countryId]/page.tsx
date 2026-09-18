"use client";

import { use } from "react";
import { EquiposOrganizationScreen } from "@/components/futbol/equipos-scope-panels";

export default function FutbolEquiposCountryPage({
  params,
}: {
  params: Promise<{ countryId: string }>;
}) {
  const { countryId } = use(params);
  return <EquiposOrganizationScreen countryId={countryId} />;
}
