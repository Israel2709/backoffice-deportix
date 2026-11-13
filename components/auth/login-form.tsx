"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { persistSessionToken } from "@/lib/auth/session";

function mapAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-email":
      return "Correo inválido.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    default:
      return "No se pudo iniciar sesión.";
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const configured = isFirebaseClientConfigured();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!configured) {
      setError(
        "Firebase no está configurado. Revisa NEXT_PUBLIC_FIREBASE_* en .env.local.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken();
      await persistSessionToken(idToken);
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : undefined;
      setError(mapAuthError(code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
      <div className="w-full max-w-md rounded-2xl border border-dx-line bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/brand/deportix-api-logo.png"
            alt="DeportiX API"
            width={140}
            height={110}
            className="h-auto max-h-[96px] w-auto object-contain"
            priority
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-dx-blue">
              Back Office
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#1b2437]">
              Iniciar sesión
            </h1>
            <p className="mt-2 text-sm text-[#5b677d]">
              Acceso solo para operadores registrados.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#445067]">
            Correo
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[10px] border border-dx-line px-3 py-2.5 font-normal text-[#1b2437] outline-none focus:border-dx-blue"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#445067]">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[10px] border border-dx-line px-3 py-2.5 font-normal text-[#1b2437] outline-none focus:border-dx-blue"
            />
          </label>

          {error ? (
            <p className="rounded-[10px] bg-[#fff1f0] px-3 py-2 text-sm text-[#b42318]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-[10px] bg-dx-blue px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
