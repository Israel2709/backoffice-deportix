"use client";

import { use } from "react";
import { EditionMatchesPanel } from "@/components/tennis/edition-matches-panel";

export default function TennisEditionPartidosPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = use(params);
  return <EditionMatchesPanel editionId={editionId} />;
}
