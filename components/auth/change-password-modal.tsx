"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { persistSessionToken } from "@/lib/auth/session";

function mapPasswordError(code: string | undefined): string {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "La contraseña actual no es correcta.";
    case "auth/weak-password":
      return "La nueva contraseña es demasiado débil (mínimo 6 caracteres).";
    case "auth/requires-recent-login":
      return "Por seguridad, cierra sesión, vuelve a entrar e inténtalo de nuevo.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    default:
      return "No se pudo cambiar la contraseña.";
  }
}

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, submitting, onClose]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser distinta a la actual.");
      return;
    }

    const user = getFirebaseAuth().currentUser;
    if (!user?.email) {
      setError("No hay una sesión válida. Vuelve a iniciar sesión.");
      return;
    }

    setSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      const idToken = await user.getIdToken(true);
      await persistSessionToken(idToken);
      toast.success("Contraseña actualizada");
      onClose();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : undefined;
      setError(mapPasswordError(code));
    } finally {
      setSubmitting(false);
    }
  }

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
        disabled={submitting}
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] w-full max-w-[420px] rounded-[18px] border border-dx-line bg-white p-6 shadow-[0_18px_50px_rgba(15,28,51,0.22)]"
      >
        <h2
          id={titleId}
          className="text-[18px] font-semibold leading-snug text-dx-ink"
        >
          Cambiar contraseña
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-dx-muted">
          Por seguridad confirma tu contraseña actual antes de definir la nueva.
        </p>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#445067]">
            Contraseña actual
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-[10px] border border-dx-line px-3 py-2.5 font-normal text-[#1b2437] outline-none focus:border-dx-blue"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#445067]">
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-[10px] border border-dx-line px-3 py-2.5 font-normal text-[#1b2437] outline-none focus:border-dx-blue"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#445067]">
            Confirmar nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-[10px] border border-dx-line px-3 py-2.5 font-normal text-[#1b2437] outline-none focus:border-dx-blue"
            />
          </label>

          {error ? (
            <p className="rounded-[10px] bg-[#fff1f0] px-3 py-2 text-sm font-normal text-[#b42318]">
              {error}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
