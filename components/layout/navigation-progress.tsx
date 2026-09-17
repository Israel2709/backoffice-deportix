"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Thin top progress bar shown while the App Router navigates between screens.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];

    setVisible(true);
    setProgress(12);

    timers.current.push(
      window.setTimeout(() => setProgress(45), 80),
      window.setTimeout(() => setProgress(72), 220),
      window.setTimeout(() => setProgress(88), 450),
      window.setTimeout(() => {
        setProgress(100);
        window.setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 180);
      }, 700),
    );

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] bg-transparent"
    >
      <div
        className={cn(
          "h-full bg-dx-blue shadow-[0_0_8px_rgba(18,61,134,0.45)] transition-[width] duration-200 ease-out",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
