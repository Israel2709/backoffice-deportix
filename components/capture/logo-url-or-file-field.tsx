"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { uploadAdminImage } from "@/lib/api/admin-uploads";
import { Field, TextInput } from "@/components/capture/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

export function LogoUrlOrFileField({
  value,
  onChange,
  folder = "logos",
  label = "Logo",
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo supera el límite de 2 MB.");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadAdminImage({
        file,
        purpose: folder === "logos" ? "league_logo" : "logo",
        filename: file.name,
      });
      onChange(result.data.url);
      setFileName(file.name);
      toast.success("Logo subido");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo subir el logo",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-3 md:col-span-2", className)}>
      <Field label={`${label} (URL)`}>
        <TextInput
          value={value}
          placeholder="https://…"
          onChange={(e) => {
            onChange(e.target.value);
            setFileName(null);
          }}
        />
      </Field>

      <Field label="O subir archivo">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Subiendo…" : "Elegir archivo"}
          </Button>
          <span className="text-[13px] text-dx-muted">
            {fileName
              ? fileName
              : "PNG, JPG, WEBP, GIF o SVG · máx. 2 MB"}
          </span>
        </div>
      </Field>

      {value ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-dx-line bg-[#f8fafc] px-3 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Vista previa del logo"
            className="h-12 w-12 rounded-lg border border-[#d9e0ea] bg-white object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold text-[#59667a]">
              Vista previa
            </div>
            <div className="truncate text-[12px] text-dx-muted">{value}</div>
          </div>
          <button
            type="button"
            className="rounded-[7px] px-2 py-1 text-[12px] font-bold text-dx-red hover:bg-[#fef3f2]"
            onClick={() => {
              onChange("");
              setFileName(null);
            }}
          >
            Quitar
          </button>
        </div>
      ) : null}
    </div>
  );
}
