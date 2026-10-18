import { redirect } from "next/navigation";

/** Legacy year-first route → org-first operación. */
export default function LegacyFutbolSeasonYearRedirect() {
  redirect("/operacion/futbol");
}
