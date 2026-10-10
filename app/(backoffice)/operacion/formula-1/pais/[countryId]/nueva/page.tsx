import { redirect } from "next/navigation";

/** Legacy create without season. New flow requires temporada first. */
export default function LegacyNuevaCompeticionF1CountryPage() {
  redirect("/operacion/formula-1");
}
