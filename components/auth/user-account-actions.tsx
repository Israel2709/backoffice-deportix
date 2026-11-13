"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { ChangePasswordModal } from "@/components/auth/change-password-modal";

export function UserAccountActions() {
  const { user, logout } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const label = user?.email ?? "Administrador";

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-[13px] font-semibold text-[#69758a]">
        <span className="hidden max-w-[220px] truncate lg:inline" title={label}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => setChangePasswordOpen(true)}
          className="rounded-[10px] border border-dx-line bg-white px-3 py-1.5 text-[13px] font-bold text-dx-blue hover:bg-[#f5f8ff]"
        >
          Cambiar contraseña
        </button>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-[10px] border border-dx-line bg-white px-3 py-1.5 text-[13px] font-bold text-dx-blue hover:bg-[#f5f8ff]"
        >
          Cerrar sesión
        </button>
      </div>
      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </>
  );
}
