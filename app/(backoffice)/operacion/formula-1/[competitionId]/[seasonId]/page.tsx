"use client";

import { use } from "react";
import { SeasonGeneralPanel } from "@/components/f1/season-general-panel";

export default function F1SeasonGeneralPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonGeneralPanel seasonId={seasonId} />;
}
