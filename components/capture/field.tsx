import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
  className,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-extrabold text-[#59667a]">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-semibold text-[#b42318]">{error}</span>
      ) : null}
    </label>
  );
}

export const inputClassName =
  "rounded-[9px] border border-[#d7dee9] bg-white px-[11px] py-[11px] text-[#253047] outline-none focus:border-dx-blue";

export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextInput(props, ref) {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(inputClassName, props.className)}
    />
  );
});

type NumberInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
};

/**
 * Controlled number field that allows clearing the input.
 * Avoids binding `Number("") === 0`, which leaves a sticky zero while typing.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ value, onChange, className, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="number"
        {...props}
        className={cn(inputClassName, className)}
        value={value == null || Number.isNaN(value) ? "" : value}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "" || raw === "-") {
            onChange(null);
            return;
          }
          const next = Number(raw);
          onChange(Number.isFinite(next) ? next : null);
        }}
      />
    );
  },
);

export function TextSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return <select {...props} className={cn(inputClassName, props.className)} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(inputClassName, "min-h-[96px] resize-y", props.className)}
    />
  );
}
