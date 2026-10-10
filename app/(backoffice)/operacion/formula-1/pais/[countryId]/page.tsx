import { redirect } from "next/navigation";

/** Legacy Country → Season entry. New flow starts at Temporada. */
export default function LegacyOperacionF1CountryPage() {
  redirect("/operacion/formula-1");
}
