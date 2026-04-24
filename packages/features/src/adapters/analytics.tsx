import { createContext, useContext, type ReactNode } from "react";

export interface AnalyticsPort {
  track(event: string, properties?: Record<string, unknown>): void;
}

const noopAnalytics: AnalyticsPort = { track: () => undefined };

const AnalyticsContext = createContext<AnalyticsPort>(noopAnalytics);

export function AnalyticsProvider({
  value = noopAnalytics,
  children,
}: {
  value?: AnalyticsPort;
  children: ReactNode;
}) {
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics(): AnalyticsPort {
  return useContext(AnalyticsContext);
}
