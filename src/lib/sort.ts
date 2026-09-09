export interface SortOption<T> {
  /** Stable identifier used by the sort control and stored as the selected value. */
  value: string;
  label: string;
  compare: (a: T, b: T) => number;
}

/** Sorts `items` using whichever option in `options` matches `value`. Falls back to the original order if not found. */
export function applySort<T>(
  items: T[],
  options: SortOption<T>[],
  value: string,
): T[] {
  const option = options.find((o) => o.value === value);
  if (!option) return items;
  return [...items].sort(option.compare);
}
