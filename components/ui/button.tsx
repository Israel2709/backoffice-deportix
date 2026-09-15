import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] px-[15px] py-[11px] text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-dx-blue text-white hover:bg-dx-blue2",
        variant === "secondary" &&
          "border border-[#cbd8ee] bg-white text-dx-blue hover:bg-[#f5f8ff]",
        variant === "ghost" && "bg-[#f6f8fb] text-[#46546a] hover:bg-[#eef1f6]",
        className,
      )}
      {...props}
    />
  );
}
