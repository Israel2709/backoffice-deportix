export function KpiGrid({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <div className="my-3.5 mb-[18px] grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[13px] border border-dx-line bg-dx-card p-[15px]"
        >
          <strong className="block text-[22px] text-dx-ink">{item.value}</strong>
          <small className="text-dx-muted">{item.label}</small>
        </div>
      ))}
    </div>
  );
}
