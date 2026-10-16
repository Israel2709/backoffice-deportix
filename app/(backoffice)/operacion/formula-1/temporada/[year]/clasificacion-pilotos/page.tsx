"use client";

import { use } from "react";
import { YearRankingsPanel } from "@/components/f1/year-rankings-panel";

export default function F1YearDriverRankingsPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = use(params);
  const year = Number(yearParam);

  if (!Number.isFinite(year)) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        Temporada inválida: {yearParam}
      </div>
    );
  }

  return <YearRankingsPanel year={year} kind="drivers" />;
}
