export function toSlug(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "tenant";
}

export async function generateUniqueSlug(
  name: string,
  existsFn: (slug: string) => Promise<boolean>,
  attempts = 5,
): Promise<string> {
  const base = toSlug(name);
  if (!(await existsFn(base))) return base;

  for (let i = 0; i < attempts; i++) {
    const suffix = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, "0");
    const candidate = `${base}-${suffix}`;
    if (!(await existsFn(candidate))) return candidate;
  }

  throw new Error(`Could not generate a unique slug for "${name}" after ${attempts} attempts`);
}
