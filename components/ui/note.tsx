import { cn } from "@/lib/utils";

export function Note({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-5 rounded-lg border-l-4 border-dx-blue bg-[#f2f6fc] px-3.5 py-3 text-[13px] text-[#56637a]",
        className,
      )}
    >
      {children}
    </div>
  );
}
