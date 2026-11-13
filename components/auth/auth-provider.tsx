"use client";

import {
  onAuthStateChanged,
  onIdTokenChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  getFirebaseAuth,
  isFirebaseClientConfigured,
} from "@/lib/firebase/client";
import { clearSessionToken, persistSessionToken } from "@/lib/auth/session";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const configured = isFirebaseClientConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubAuth = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });

    const unsubToken = onIdTokenChanged(auth, async (next) => {
      if (!next) {
        await clearSessionToken();
        return;
      }
      try {
        const idToken = await next.getIdToken();
        await persistSessionToken(idToken);
      } catch {
        // Proxy will 401 on writes; login flow surfaces errors explicitly.
      }
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, [configured]);

  const logout = useCallback(async () => {
    if (configured) {
      await signOut(getFirebaseAuth());
    }
    await clearSessionToken();
    router.replace("/login");
    router.refresh();
  }, [configured, router]);

  const value = useMemo(
    () => ({ user, loading, configured, logout }),
    [user, loading, configured, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
