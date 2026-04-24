import { useEffect, useState } from "react";

let cached: string | null = null;
let inflight: Promise<string> | null = null;

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(cached);

  useEffect(() => {
    if (cached) return;
    if (!window.api?.getAppVersion) return;

    inflight ??= window.api.getAppVersion().then((v) => {
      cached = v;
      return v;
    });

    let cancelled = false;
    inflight.then((v) => {
      if (!cancelled) setVersion(v);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
