"use client";

import { use } from "react";
import { EditionParticipantsPanel } from "@/components/tennis/edition-participants-panel";

export default function TennisEditionParticipantesPage({
  params,
}: {
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = use(params);
  return <EditionParticipantsPanel editionId={editionId} />;
}
