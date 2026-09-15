import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-extrabold text-[#59667a]">{label}</span>
      {children}
    </label>
  );
}

export const inputClassName =
  "rounded-[9px] border border-[#d7dee9] bg-white px-[11px] py-[11px] text-[#253047] outline-none focus:border-dx-blue";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input {...props} className={cn(inputClassName, props.className)} />;
}

export function TextSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return <select {...props} className={cn(inputClassName, props.className)} />;
}
