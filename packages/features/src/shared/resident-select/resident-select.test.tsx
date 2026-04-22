import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TransportPort } from "../../adapters";
import { renderWithHarness } from "../../test/harness";
import { ResidentSelect } from "./index";

afterEach(() => cleanup());

const SEARCH_PLACEHOLDER = "residents.select.searchPlaceholder";

function makeResident(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    fullName: "Ana García",
    email: "ana@example.com",
    address: "Calle 1 #10",
    status: "active",
    role: "resident",
    tenantId: "test-tenant-id",
    username: null,
    phone: null,
    phoneType: null,
    userGroupIds: [],
    observations: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

const defaultResidents = [
  makeResident(),
  makeResident({ id: "r2", fullName: "Carlos López", address: null }),
];

type GetFn = ReturnType<typeof vi.fn>;

function transport(getFn: GetFn): Partial<TransportPort> {
  return { get: getFn as unknown as TransportPort["get"] };
}

function makeDefaultGetFn(): GetFn {
  return vi.fn(async (url: string) => {
    if (url === "/residents") {
      return { data: defaultResidents, meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 } };
    }
    if (url.startsWith("/residents/")) {
      const id = url.slice("/residents/".length);
      const found = defaultResidents.find((r) => r.id === id);
      if (!found) throw new Error("404");
      return found;
    }
    throw new Error(`unexpected url: ${url}`);
  });
}

// ─── Trigger rendering ───────────────────────────────────────────────────────

describe("ResidentSelect — trigger rendering", () => {
  it("(a) shows placeholder when value is empty", () => {
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("residents.select.placeholder");
  });

  it("(a) shows custom placeholder prop when value is empty", () => {
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Pick one");
  });

  it("(b) shows resident name when value matches a resident in the current list page", async () => {
    renderWithHarness(<ResidentSelect value="r1" onChange={() => {}} />, {
      transport: transport(makeDefaultGetFn()),
    });
    expect(await screen.findByText(/Ana García/)).toBeInTheDocument();
  });

  it("(b) appends address when resident has one", async () => {
    renderWithHarness(<ResidentSelect value="r1" onChange={() => {}} />, {
      transport: transport(makeDefaultGetFn()),
    });
    expect(await screen.findByText(/Ana García — Calle 1 #10/)).toBeInTheDocument();
  });

  it("disabled prop disables the trigger", () => {
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("ariaLabel prop overrides the default aria-label", () => {
    renderWithHarness(
      <ResidentSelect value="" onChange={() => {}} ariaLabel="Choose resident" />,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Choose resident");
  });
});

// ─── US3: resolver for saved value not in current page ───────────────────────

describe("ResidentSelect — US3: resolver for out-of-page value", () => {
  it("(b ext) trigger shows resolved name when value not in current list page", async () => {
    const outOfPageResident = makeResident({
      id: "r-out",
      fullName: "Zacarías Ortega",
      address: null,
    });
    const getFn = vi.fn(async (url: string) => {
      if (url === "/residents") {
        return { data: defaultResidents, meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 } };
      }
      if (url === "/residents/r-out") return outOfPageResident;
      throw new Error(`unexpected: ${url}`);
    });
    renderWithHarness(<ResidentSelect value="r-out" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    expect(await screen.findByText("Zacarías Ortega")).toBeInTheDocument();
    expect(getFn).toHaveBeenCalledWith("/residents/r-out");
  });

  it("(b ext) makes exactly one /residents/:id request for resolver", async () => {
    const outOfPageResident = makeResident({
      id: "r-out",
      fullName: "Zacarías Ortega",
      address: null,
    });
    const getFn = vi.fn(async (url: string) => {
      if (url === "/residents") {
        return { data: defaultResidents, meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 } };
      }
      if (url === "/residents/r-out") return outOfPageResident;
      throw new Error(`unexpected: ${url}`);
    });
    renderWithHarness(<ResidentSelect value="r-out" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await screen.findByText("Zacarías Ortega");
    const resolverCalls = getFn.mock.calls.filter(([url]) => url === "/residents/r-out");
    expect(resolverCalls).toHaveLength(1);
  });

  it("(g) falls back to placeholder when resolver returns 404", async () => {
    const getFn = vi.fn(async (url: string) => {
      if (url === "/residents") {
        return { data: defaultResidents, meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 } };
      }
      if (url.startsWith("/residents/")) throw new Error("404");
      throw new Error(`unexpected: ${url}`);
    });
    renderWithHarness(<ResidentSelect value="nonexistent" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("residents.select.placeholder");
    });
  });
});

// ─── US1: popover opens with list and search ─────────────────────────────────

describe("ResidentSelect — US1: popover interaction", () => {
  it("(c) opens popover with search input and list on trigger click", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(makeDefaultGetFn()),
    });
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
    expect(await screen.findByText("Ana García")).toBeInTheDocument();
    expect(await screen.findByText("Carlos López")).toBeInTheDocument();
  });

  it("(e) selecting a CommandItem calls onChange with resident id and closes popover", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ResidentSelect value="" onChange={onChange} />, {
      transport: transport(makeDefaultGetFn()),
    });
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Ana García");
    await user.click(screen.getByText("Ana García"));
    expect(onChange).toHaveBeenCalledWith("r1");
    expect(screen.queryByPlaceholderText(SEARCH_PLACEHOLDER)).not.toBeInTheDocument();
  });

  it("(f) no 'create new resident' affordance is present in the popover", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(makeDefaultGetFn()),
    });
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Ana García");
    expect(screen.queryByText(/create|nuevo|add|agregar/i)).not.toBeInTheDocument();
  });
});

// ─── US2: debounced server search ────────────────────────────────────────────

describe("ResidentSelect — US2: debounced search", () => {
  it("(d) typing issues a debounced request with the search term", async () => {
    const user = userEvent.setup();
    const zacarías = makeResident({ id: "r-zaca", fullName: "Zacarías Ortega", address: null });
    const getFn = vi.fn(
      async (url: string, opts?: { params?: Record<string, unknown> }) => {
        const search = opts?.params?.search;
        if (url === "/residents") {
          return {
            data: search === "zaca" ? [zacarías] : defaultResidents,
            meta: { page: 1, pageSize: 50, total: search === "zaca" ? 1 : 2, totalPages: 1 },
          };
        }
        throw new Error(`unexpected: ${url}`);
      },
    );
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Ana García");

    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "zaca");

    await waitFor(
      () => {
        const searchCalls = getFn.mock.calls.filter(
          (args: unknown[]) => {
            const [url, opts] = args as [string, { params?: Record<string, unknown> } | undefined];
            return url === "/residents" && opts?.params?.search === "zaca";
          },
        );
        expect(searchCalls).toHaveLength(1);
      },
      { timeout: 2000 },
    );
    expect(await screen.findByText("Zacarías Ortega")).toBeInTheDocument();
  }, 8000);

  it("(US2-4) clearing search issues an unfiltered request", async () => {
    const user = userEvent.setup();
    const getFn = makeDefaultGetFn();
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Ana García");

    await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "foo");
    await waitFor(
      () => {
        const searchCalls = getFn.mock.calls.filter(
          (args: unknown[]) => {
            const [url, opts] = args as [string, { params?: Record<string, unknown> } | undefined];
            return url === "/residents" && opts?.params?.search === "foo";
          },
        );
        expect(searchCalls.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 2000 },
    );

    await user.clear(screen.getByPlaceholderText(SEARCH_PLACEHOLDER));

    await waitFor(
      () => {
        const unfiltered = getFn.mock.calls.filter(
          (args: unknown[]) => {
            const [url, opts] = args as [string, { params?: Record<string, unknown> } | undefined];
            return url === "/residents" && !opts?.params?.search;
          },
        );
        expect(unfiltered.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 2000 },
    );
  }, 8000);
});

// ─── Empty and error states ──────────────────────────────────────────────────

describe("ResidentSelect — empty and error states", () => {
  it("(f) renders empty state when transport returns no results", async () => {
    const user = userEvent.setup();
    const getFn = vi.fn(async () => ({
      data: [],
      meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    }));
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("residents.select.empty")).toBeInTheDocument();
    expect(screen.queryByText(/create|nuevo|add|agregar/i)).not.toBeInTheDocument();
  });

  it("(US4) renders error caption when transport rejects", async () => {
    const user = userEvent.setup();
    const getFn = vi.fn(async () => {
      throw new Error("Network error");
    });
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("residents.select.error")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
  });
});

// ─── US3: stale-response / unmount safety ────────────────────────────────────

describe("ResidentSelect — US3: stale-response guard", () => {
  it("(FR-014) unmounting mid-flight does not produce act warnings", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveTransport!: (value: unknown) => void;
    const getFn = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveTransport = resolve;
        }),
    );
    const { unmount } = renderWithHarness(
      <ResidentSelect value="" onChange={() => {}} />,
      { transport: transport(getFn) },
    );
    unmount();
    await act(async () => {
      resolveTransport({
        data: [],
        meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
      });
    });
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining("act("));
    consoleSpy.mockRestore();
  });
});

// ─── Regression guard: public prop contract ──────────────────────────────────

describe("ResidentSelect — regression guard (SC-003)", () => {
  it("(g) <ResidentSelect value={id} onChange={fn} /> compiles and renders a combobox", () => {
    renderWithHarness(<ResidentSelect value="r1" onChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("(g) <ResidentSelect value={id} onChange={fn} placeholder='…' /> compiles and renders", () => {
    renderWithHarness(
      <ResidentSelect value="r1" onChange={vi.fn()} placeholder="Select a resident" />,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});

// ─── US4: loading state ──────────────────────────────────────────────────────

describe("ResidentSelect — US4: loading state", () => {
  it("renders loading caption while transport is pending and no cached data", async () => {
    const user = userEvent.setup();
    let resolveTransport!: (value: unknown) => void;
    const getFn = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveTransport = resolve;
        }),
    );
    renderWithHarness(<ResidentSelect value="" onChange={() => {}} />, {
      transport: transport(getFn),
    });
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("residents.select.loading")).toBeInTheDocument();
    await act(async () => {
      resolveTransport({ data: [], meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 } });
    });
  });
});
