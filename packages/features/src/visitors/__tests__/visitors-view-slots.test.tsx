import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup, act } from "@testing-library/react";

afterEach(() => cleanup());
import { renderWithHarness } from "../../test/harness";
import { VisitorsView } from "../components/visitors-view";

vi.mock("../hooks/use-visit-persons", () => ({
  useVisitPersons: () => ({ data: { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }, isLoading: false, isError: false }),
}));
vi.mock("../hooks/use-recent-visit-person-events", () => ({ useRecentVisitPersonEvents: () => ({ data: undefined, isLoading: false }) }));
vi.mock("../hooks/use-visit-person-vehicles", () => ({ useVisitPersonVehicles: () => ({ data: undefined, isLoading: false }) }));
vi.mock("../hooks/use-visit-person-images", () => ({ useVisitPersonImages: () => ({ data: undefined, isLoading: false }) }));
vi.mock("../hooks/use-create-access-event", () => ({ useCreateAccessEvent: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("../hooks/use-create-visit-person", () => ({ useCreateVisitPerson: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("../hooks/use-update-visit-person", () => ({ useUpdateVisitPerson: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("../hooks/use-upload-visit-person-image", () => ({ useUploadVisitPersonImage: () => ({ mutate: vi.fn(), isPending: false }) }));

describe("VisitorsView slot props", () => {
  it("renders topRightSlot when provided", () => {
    renderWithHarness(
      <VisitorsView topRightSlot={<span data-testid="top-right">Sync</span>} />,
    );
    expect(screen.getByTestId("top-right")).toBeDefined();
  });

  it("does not render topRightSlot container when not provided", () => {
    renderWithHarness(<VisitorsView />);
    expect(screen.queryByTestId("top-right")).toBeNull();
  });

  it("renders emptyState slot when provided and data is empty", () => {
    renderWithHarness(
      <VisitorsView emptyState={<span data-testid="custom-empty">Vacío</span>} />,
    );
    expect(screen.getByTestId("custom-empty")).toBeDefined();
  });

  it("renders the ShortcutsHint inside the visitors view", () => {
    renderWithHarness(<VisitorsView />);
    expect(screen.getByLabelText("shortcuts.ariaLabel")).toBeDefined();
  });

  it("pressing N opens the create sidebar (visitors)", () => {
    renderWithHarness(<VisitorsView />);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    });
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("pressing F focuses the search input (visitors)", () => {
    renderWithHarness(<VisitorsView />);
    const search = screen.getByPlaceholderText("visitPersons.searchPlaceholder") as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }));
    });
    expect(document.activeElement).toBe(search);
  });
});
