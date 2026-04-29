import { useReducer } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { renderWithHarness } from "../../test/harness";
import { VisitPersonForm } from "../components/visit-person-form";

afterEach(() => cleanup());

const defaultProps = {
  onSave: vi.fn(),
  onCancel: vi.fn(),
  isSaving: false,
};

describe("VisitPersonForm", () => {
  it("renders required fields", () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />);
    expect(screen.getByText("visitPersons.form.fullName")).toBeDefined();
    expect(screen.getByText("visitPersons.form.status")).toBeDefined();
  });

  it("requires fullName before submission", async () => {
    const onSave = vi.fn();
    renderWithHarness(<VisitPersonForm {...defaultProps} onSave={onSave} />);

    const saveButton = screen.getAllByRole("button").find(
      (b) => b.textContent?.includes("visitPersons.form.save"),
    );
    expect(saveButton).toBeDefined();
    expect(saveButton).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("enables save button when fullName is provided", async () => {
    const onSave = vi.fn();
    renderWithHarness(<VisitPersonForm {...defaultProps} onSave={onSave} />);

    const inputs = screen.getAllByPlaceholderText("visitPersons.form.fullName");
    fireEvent.change(inputs[0], { target: { value: "Juan Pérez" } });

    await waitFor(() => {
      const saveButtons = screen.getAllByRole("button").filter(
        (b) => b.textContent?.includes("visitPersons.form.save") ||
               b.getAttribute("type") === "submit",
      );
      const submitBtn = saveButtons.find((b) => b.getAttribute("type") === "submit");
      expect(submitBtn).toBeDefined();
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it("calls onDraftChange when input changes", async () => {
    const onDraftChange = vi.fn();
    renderWithHarness(
      <VisitPersonForm {...defaultProps} onDraftChange={onDraftChange} />,
    );

    const inputs = screen.getAllByPlaceholderText("visitPersons.form.fullName");
    fireEvent.change(inputs[0], { target: { value: "Ana" } });

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenCalled();
    });
  });

  it("does not re-fire onDraftChange when parent re-renders with new callback identity", async () => {
    const spy = vi.fn();
    function Wrapper() {
      const [, force] = useReducer((x: number) => x + 1, 0);
      return (
        <>
          <VisitPersonForm {...defaultProps} onDraftChange={(d) => spy(d)} />
          <button type="button" onClick={force}>
            rerender
          </button>
        </>
      );
    }

    renderWithHarness(<Wrapper />);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const initialCalls = spy.mock.calls.length;

    fireEvent.click(screen.getByText("rerender"));
    fireEvent.click(screen.getByText("rerender"));
    fireEvent.click(screen.getByText("rerender"));

    expect(spy.mock.calls.length).toBe(initialCalls);
  });

  it("pre-fills fields from initialDraft", () => {
    const initialDraft = {
      fullName: "Carlos",
      phone: "",
      status: "allowed" as const,
      residentId: "",
      notes: "test note",
    };
    renderWithHarness(
      <VisitPersonForm {...defaultProps} initialDraft={initialDraft} />,
    );

    const inputs = screen.getAllByDisplayValue("Carlos") as HTMLInputElement[];
    const input = inputs[0];
    expect(input.value).toBe("Carlos");
  });

  it("renders the status select disabled when role is Guard", () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />, {
      role: { role: "Guard" },
    });
    const trigger = screen.getByTestId("visit-person-status-select");
    expect(trigger).toBeDisabled();
  });

  it("renders the status select enabled when role is Admin", () => {
    renderWithHarness(<VisitPersonForm {...defaultProps} />, {
      role: { role: "Admin" },
    });
    const trigger = screen.getByTestId("visit-person-status-select");
    expect(trigger).not.toBeDisabled();
  });

  it("uses 'flagged' as the initial status when no initialDraft is provided", () => {
    const onSave = vi.fn();
    renderWithHarness(
      <VisitPersonForm {...defaultProps} onSave={onSave} />,
      { role: { role: "Admin" } },
    );

    const inputs = screen.getAllByPlaceholderText("visitPersons.form.fullName");
    fireEvent.change(inputs[0], { target: { value: "Test Name" } });

    const saveButton = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("type") === "submit");
    fireEvent.click(saveButton!);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].status).toBe("flagged");
  });
});
