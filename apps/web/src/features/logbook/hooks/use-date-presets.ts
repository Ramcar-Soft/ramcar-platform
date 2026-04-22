"use client";

export type DatePreset =
  | "today"
  | "last_7d"
  | "last_30d"
  | "last_90d"
  | "custom";

function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useDatePresets() {
  function getPresetRange(
    preset: DatePreset,
  ): { from: string; to: string } | null {
    if (preset === "custom") return null;
    const now = new Date();
    const today = toISODate(now);

    if (preset === "today") return { from: today, to: today };

    const daysAgo =
      preset === "last_7d" ? 7 : preset === "last_30d" ? 30 : 90;
    const past = new Date(now);
    past.setUTCDate(past.getUTCDate() - daysAgo + 1);
    return { from: toISODate(past), to: today };
  }

  return { getPresetRange };
}
