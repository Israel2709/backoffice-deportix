"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateTeam } from "@/lib/api/admin-soccer";
import { uploadAdminImage } from "@/lib/api/admin-uploads";
import { Button } from "@/components/ui/button";

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

export function TeamLogoModal({
  open,
  onClose,
  teamId,
  teamName,
  currentLogo,
  leagueId,
  countryName,
}: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  currentLogo: string | null;
  leagueId: string;
  countryName?: string | null;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [open, teamId]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Selecciona un archivo de imagen.");
      }
      const uploaded = await uploadAdminImage({
        file: selectedFile,
        purpose: "logo",
        entityId: teamId,
        filename: selectedFile.name,
      });
      await updateTeam(teamId, {
        logo: uploaded.data.url,
        league_id: leagueId || undefined,
        country_name: countryName?.trim() || undefined,
      });
      return uploaded.data.url;
    },
    onSuccess: () => {
      toast.success("Logo actualizado");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "teams"],
      });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await updateTeam(teamId, {
        logo: null,
        league_id: leagueId || undefined,
        country_name: countryName?.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Logo eliminado");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "teams"],
      });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  const busy = saveMutation.isPending || clearMutation.isPending;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy, onClose]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("El archivo supera el límite de 2 MB.");
      return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  }

  const shownLogo = previewUrl || currentLogo || null;

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-[#0f1c33]/45 backdrop-blur-[1px]"
        disabled={busy}
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] w-full max-w-[440px] rounded-[18px] border border-dx-line bg-white p-6 shadow-[0_18px_50px_rgba(15,28,51,0.22)]"
      >
        <h2
          id={titleId}
          className="text-[18px] font-semibold leading-snug text-dx-ink"
        >
          Logo del equipo
        </h2>
        <p className="mt-1 text-[13px] text-dx-muted">{teamName}</p>

        <div className="mt-5 flex flex-col items-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-[14px] border border-dx-line bg-[#f8fafc] p-3">
            {shownLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownLogo}
                alt={`Logo de ${teamName}`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-[12px] text-dx-muted">Sin logo</span>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <div className="flex w-full flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              className="w-full justify-center"
              onClick={() => inputRef.current?.click()}
            >
              {selectedFile ? "Cambiar archivo" : "Seleccionar archivo"}
            </Button>
            <p className="text-center text-[12px] text-dx-muted">
              {selectedFile
                ? selectedFile.name
                : "PNG, JPG, WEBP, GIF o SVG · máx. 2 MB"}
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-[10px] bg-[#fff1f0] px-3 py-2 text-sm text-[#b42318]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          {currentLogo ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              className="text-dx-red hover:bg-[#fef3f2]"
              onClick={() => clearMutation.mutate()}
            >
              {clearMutation.isPending ? "Quitando…" : "Quitar logo"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy || !selectedFile}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar logo"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
