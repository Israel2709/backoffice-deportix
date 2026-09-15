import { Button } from "@/components/ui/button";

export function StickyActions({
  dirty,
  saving,
  onDiscard,
  onSave,
  saveLabel = "Guardar",
}: {
  dirty: boolean;
  saving?: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  if (!dirty) return null;

  return (
    <div className="sticky bottom-0 z-10 mt-3 flex justify-end gap-2.5 border-t border-dx-line bg-[rgba(245,247,250,0.96)] py-3 backdrop-blur-[6px]">
      <Button variant="secondary" onClick={onDiscard} disabled={saving}>
        Descartar cambios
      </Button>
      <Button onClick={onSave} disabled={saving}>
        {saving ? "Guardando…" : saveLabel}
      </Button>
    </div>
  );
}
