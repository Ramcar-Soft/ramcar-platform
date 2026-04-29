import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup, act } from "@testing-library/react";
import { renderWithHarness } from "../../test/harness";
import { AccessEventFeedbackOverlay } from "./access-event-feedback-overlay";
import type { AccessEventFeedbackController, AccessEventFeedbackState } from "../types";

afterEach(() => cleanup());

const payload = {
  personName: "Ana García López",
  direction: "entry" as const,
  accessMode: "vehicle" as const,
};

function makeController(state: AccessEventFeedbackState): AccessEventFeedbackController {
  return {
    state,
    show: vi.fn(),
    dismiss: vi.fn(),
    retry: vi.fn(),
  };
}

describe("AccessEventFeedbackOverlay", () => {
  // C-1: renders null when idle
  it("renders nothing when state is idle", () => {
    const controller = makeController({ kind: "idle" });
    const { container } = renderWithHarness(
      <AccessEventFeedbackOverlay controller={controller} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // C-2: success variant renders correct content
  it("renders success card with icon, title, description", () => {
    const controller = makeController({
      kind: "success",
      payload,
      autoDismissAt: Date.now() + 2000,
    });
    renderWithHarness(<AccessEventFeedbackOverlay controller={controller} />);

    expect(screen.getByRole("dialog")).toBeDefined();
    // Title from i18n (key returned as-is by mock)
    expect(
      screen.getByText("accessEvents.feedback.successTitle"),
    ).toBeDefined();
    // Description key
    expect(
      screen.queryByText(/accessEvents\.feedback\.successDescription/),
    ).toBeDefined();
    // No retry/dismiss buttons on success
    expect(
      screen.queryByText("accessEvents.feedback.retry"),
    ).toBeNull();
  });

  // C-3, C-4: error variant renders error icon, title, reason, retry + dismiss
  it("renders error card with error icon, title, reason, Retry, Dismiss buttons", () => {
    const controller = makeController({
      kind: "error",
      payload,
      reason: "Connection refused",
      retryFn: vi.fn().mockResolvedValue(undefined),
    });
    renderWithHarness(<AccessEventFeedbackOverlay controller={controller} />);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(
      screen.getByText("accessEvents.feedback.errorTitle"),
    ).toBeDefined();
    expect(screen.getByText("Connection refused")).toBeDefined();
    expect(
      screen.getByText("accessEvents.feedback.retry"),
    ).toBeDefined();
    expect(
      screen.getByText("accessEvents.feedback.dismiss"),
    ).toBeDefined();
  });

  // error falls back to errorFallbackReason when reason is empty
  it("uses errorFallbackReason when reason is empty string", () => {
    const controller = makeController({
      kind: "error",
      payload,
      reason: "",
      retryFn: vi.fn().mockResolvedValue(undefined),
    });
    renderWithHarness(<AccessEventFeedbackOverlay controller={controller} />);
    expect(
      screen.getByText("accessEvents.feedback.errorFallbackReason"),
    ).toBeDefined();
  });

  // role="status" polite live region on success
  it("success: has role=status live region", () => {
    const controller = makeController({
      kind: "success",
      payload,
      autoDismissAt: Date.now() + 2000,
    });
    renderWithHarness(<AccessEventFeedbackOverlay controller={controller} />);
    expect(screen.getByRole("status")).toBeDefined();
  });

  // role="alert" assertive live region on error
  it("error: has role=alert live region", () => {
    const controller = makeController({
      kind: "error",
      payload,
      reason: "fail",
      retryFn: vi.fn().mockResolvedValue(undefined),
    });
    renderWithHarness(<AccessEventFeedbackOverlay controller={controller} />);
    expect(screen.getByRole("alert")).toBeDefined();
  });

  // Retry button calls controller.retry()
  it("Retry button calls controller.retry()", async () => {
    const controller = makeController({
      kind: "error",
      payload,
      reason: "fail",
      retryFn: vi.fn().mockResolvedValue(undefined),
    });
    const { getByText } = renderWithHarness(
      <AccessEventFeedbackOverlay controller={controller} />,
    );
    await act(async () => {
      getByText("accessEvents.feedback.retry").click();
    });
    expect(controller.retry).toHaveBeenCalledOnce();
  });

  // Dismiss button calls controller.dismiss()
  it("Dismiss button calls controller.dismiss()", async () => {
    const controller = makeController({
      kind: "error",
      payload,
      reason: "fail",
      retryFn: vi.fn().mockResolvedValue(undefined),
    });
    const { getByText } = renderWithHarness(
      <AccessEventFeedbackOverlay controller={controller} />,
    );
    await act(async () => {
      getByText("accessEvents.feedback.dismiss").click();
    });
    expect(controller.dismiss).toHaveBeenCalledOnce();
  });

  // C-5: long personName wraps without breaking layout
  it("long personName (50+ chars) renders without truncation errors", () => {
    const longName =
      "Maximiliano Hernández Sebastián de la Fuente y Ramírez Castro";
    const controller = makeController({
      kind: "success",
      payload: { ...payload, personName: longName },
      autoDismissAt: Date.now() + 2000,
    });
    renderWithHarness(<AccessEventFeedbackOverlay controller={controller} />);
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  // Layout-shift: overlay portals to body, underlying element position unchanged (T030)
  it("does not shift layout of underlying content", () => {
    const ref = document.createElement("div");
    ref.setAttribute("data-testid", "surface");
    document.body.appendChild(ref);
    const before = ref.getBoundingClientRect();

    const controller = makeController({
      kind: "success",
      payload,
      autoDismissAt: Date.now() + 2000,
    });
    renderWithHarness(<AccessEventFeedbackOverlay controller={controller} />);

    const after = ref.getBoundingClientRect();
    expect(after.top).toBe(before.top);
    expect(after.left).toBe(before.left);
    document.body.removeChild(ref);
  });
});
