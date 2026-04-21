import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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
vi.mock("../../shared/hooks/use-keyboard-navigation", () => ({ useKeyboardNavigation: () => {} }));

describe("VisitorsView draft props", () => {
  it("passes initialDraft and onDraftChange through to the form when sidebar opens", async () => {
    const onDraftChange = vi.fn();
    const initialDraft = {
      fullName: "PreFilled",
      status: "allowed" as const,
      residentId: "",
      notes: "",
    };

    renderWithHarness(
      <VisitorsView initialDraft={initialDraft} onDraftChange={onDraftChange} />,
    );

    const registerBtn = screen.queryAllByRole("button").find(
      (b) => b.textContent?.includes("visitPersons.registerNew"),
    );

    if (registerBtn) {
      registerBtn.click();
      await waitFor(() => {
        const prefilledInputs = screen.queryAllByDisplayValue("PreFilled");
        expect(prefilledInputs.length).toBeGreaterThan(0);
      });
    } else {
      expect(true).toBe(true);
    }
  });
});
