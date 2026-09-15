import { cn } from "@/lib/utils";

export function StatusBadge({
  children,
  tone = "gray",
  className,
}: {
  children: React.ReactNode;
  tone?: "green" | "gray" | "amber" | "red";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-[9px] py-[5px] text-xs font-extrabold",
        tone === "green" && "bg-[#e9f7f1] text-dx-green",
        tone === "gray" && "bg-[#eef1f5] text-[#667085]",
        tone === "amber" && "bg-[#fff5db] text-[#9b6700]",
        tone === "red" && "bg-[#fff0ef] text-dx-red",
        className,
      )}
    >
      {children}
    </span>
  );
}
