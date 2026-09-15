"use client";

import { use } from "react";
import { EditionGeneralPanel } from "@/components/tennis/edition-general-panel";

export default function TennisEditionGeneralPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = use(params);
  return <EditionGeneralPanel editionId={editionId} />;
}
