import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-sm text-[#5b677d]">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
