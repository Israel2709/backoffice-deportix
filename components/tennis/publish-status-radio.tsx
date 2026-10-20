"use client";

import { cn } from "@/lib/utils";
import type { TennisPublishStatus } from "@/lib/api/tennis-types";

const OPTIONS: { value: TennisPublishStatus; label: string }[] = [
  { value: "published", label: "Publicado" },
  { value: "draft", label: "Borrador" },
];

export function PublishStatusRadio({
  value,
  onChange,
  className,
  disabled,
  compact,
  name,
}: {
  value: TennisPublishStatus;
  onChange: (value: TennisPublishStatus) => void;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Unique name when several radios appear on the same page (e.g. list rows). */
  name?: string;
}) {
  const groupName = name ?? "publish-status";

  return (
    <div
      role="radiogroup"
      aria-label="Publicación"
      className={cn(
        "flex items-center gap-4",
        !compact &&
          "rounded-[10px] border border-[#d7dee9] bg-white px-3 py-3",
        disabled && "opacity-60",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-center gap-2",
              disabled && "cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="size-4 shrink-0 accent-dx-blue"
            />
            <span
              className={cn(
                "text-sm font-semibold",
                selected ? "text-dx-ink" : "text-dx-muted",
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
