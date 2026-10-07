import Link from "next/link";
import { cn } from "@/lib/utils";

export type CountryCardProps = {
  name: string;
  /** ISO-style country code, e.g. `al`, `dz`. */
  code?: string | null;
  imageUrl?: string | null;
  /**
   * Text shown in the media area when there is no `imageUrl`
   * (defaults to the first 2 characters of code/name).
   */
  mediaLabel?: string | null;
  href?: string;
  className?: string;
};

function CountryCardBody({
  name,
  code,
  imageUrl,
  mediaLabel,
}: Pick<CountryCardProps, "name" | "code" | "imageUrl" | "mediaLabel">) {
  const codeLabel = code?.trim() || null;
  const fallback =
    mediaLabel?.trim() ||
    (codeLabel || name).slice(0, 2).toUpperCase();

  return (
    <>
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-[#eef4ff]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center font-black tracking-wide text-dx-blue",
              mediaLabel?.trim() ? "text-2xl" : "text-sm",
            )}
          >
            {fallback}
          </span>
        )}
      </div>
      {codeLabel || name !== fallback ? (
        <div className="min-w-0 px-2 py-3 text-center">
          <h3 className="truncate text-[15px] font-semibold leading-snug text-dx-ink">
            {name}
          </h3>
          {codeLabel ? (
            <p className="mt-1 truncate text-[12px] font-medium uppercase tracking-wide text-dx-muted">
              {codeLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

const cardClassName = (className?: string) =>
  cn(
    "flex flex-col overflow-hidden rounded-2xl border border-dx-line bg-dx-card shadow-[0_4px_14px_rgba(19,53,105,0.1)] transition",
    "hover:border-[#b9c9e7] hover:shadow-[0_8px_22px_rgba(19,53,105,0.14)]",
    className,
  );

/**
 * Vertical country tile: flag → name → code.
 * Place inside {@link CountryCardsGrid} or any CSS grid/flex parent.
 */
export function CountryCard({
  name,
  code,
  imageUrl,
  mediaLabel,
  href,
  className,
}: CountryCardProps) {
  const body = (
    <CountryCardBody
      name={name}
      code={code}
      imageUrl={imageUrl}
      mediaLabel={mediaLabel}
    />
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName(className)}>
        {body}
      </Link>
    );
  }

  return <div className={cardClassName(className)}>{body}</div>;
}

/**
 * Responsive grid for {@link CountryCard} tiles.
 * Up to 12 equal columns on desktop (`lg+`).
 */
export function CountryCardsGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12",
        className,
      )}
    >
      {children}
    </div>
  );
}
