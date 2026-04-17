import { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StoreProvider } from "@ramcar/store";
import { TransportProvider, I18nProvider, RoleProvider } from "../adapters";
import type { TransportPort, I18nPort, RolePort } from "../adapters";

const mockTransport: TransportPort = {
  get: async () => ({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }) as never,
  post: async (_, data) => data as never,
  patch: async (_, data) => data as never,
  put: async (_, data) => data as never,
  delete: async () => undefined as never,
  upload: async () => ({}) as never,
};

const mockI18n: I18nPort = {
  t: (key) => key,
  locale: "en",
};

const mockRole: RolePort = {
  role: "Guard",
  tenantId: "test-tenant-id",
  userId: "test-user-id",
};

interface HarnessOptions {
  transport?: Partial<TransportPort>;
  i18n?: Partial<I18nPort>;
  role?: Partial<RolePort>;
}

function Harness({
  children,
  options = {},
}: {
  children: ReactNode;
  options?: HarnessOptions;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const transport = { ...mockTransport, ...options.transport };
  const i18n = { ...mockI18n, ...options.i18n };
  const role = { ...mockRole, ...options.role };

  return (
    <StoreProvider>
      <QueryClientProvider client={queryClient}>
        <TransportProvider value={transport}>
          <I18nProvider value={i18n}>
            <RoleProvider value={role}>{children}</RoleProvider>
          </I18nProvider>
        </TransportProvider>
      </QueryClientProvider>
    </StoreProvider>
  );
}

export function renderWithHarness(
  ui: ReactNode,
  overrides: HarnessOptions = {},
  renderOptions?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof render> {
  return render(ui, {
    ...renderOptions,
    wrapper: ({ children }) => <Harness options={overrides}>{children}</Harness>,
  });
}

export { mockTransport, mockI18n, mockRole };
