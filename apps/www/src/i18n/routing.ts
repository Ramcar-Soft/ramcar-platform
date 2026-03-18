import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es-MX", "en-US"],
  defaultLocale: "es-MX",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const navigation: Record<string, any> = createNavigation(routing);

export const Link = navigation.Link as typeof import("next/link").default;
export const redirect = navigation.redirect as (
  url: string,
  options?: { locale?: string },
) => never;
export const usePathname = navigation.usePathname as () => string;
export const useRouter = navigation.useRouter as () => {
  push: (href: string, options?: { locale?: string }) => void;
  replace: (href: string, options?: { locale?: string }) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
};
