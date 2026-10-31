export function formatDataCapacity(label: string): string | null {
  const match = label.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();
  const megabytes = amount * (
    unit === "KB" ? 0.001 :
      unit === "GB" ? 1000 :
      unit === "TB" ? 1000000 :
      1
  );
  if (!Number.isFinite(megabytes) || megabytes <= 0) return null;

  return megabytes >= 1000
    ? `${(megabytes / 1000).toFixed(1)} GB`
    : `${Number(megabytes.toFixed(3))} MB`;
}

export function applyDisplayCapacity(label: string, capacity: string | null): string {
  if (!capacity) return label;
  const capacityPattern = /\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB)/i;
  return capacityPattern.test(label)
    ? label.replace(capacityPattern, capacity)
    : `${capacity} ${label}`;
}
