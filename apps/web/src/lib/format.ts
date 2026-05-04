export function badgeClass(value: string) {
  if (["hot", "today", "qualified", "booked"].includes(value)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["warm", "this_week", "contacted"].includes(value)) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (["cold", "lost"].includes(value)) return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
