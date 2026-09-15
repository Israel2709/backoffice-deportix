export function Hero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-[18px] border border-dx-line bg-dx-card px-7 py-[26px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold tracking-[0.06em] text-dx-blue uppercase">
            {eyebrow}
          </div>
          <h1 className="mt-2 mb-2 text-[30px] leading-tight font-semibold text-dx-ink">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-[15px] leading-relaxed text-dx-muted">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
