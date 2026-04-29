import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccessEventFeedback } from "./use-access-event-feedback";

describe("useAccessEventFeedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const payload = { personName: "Jane Doe", direction: "entry" as const, accessMode: "vehicle" as const };

  // H-1: idle on initial render
  it("starts in idle state", () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    expect(result.current.state.kind).toBe("idle");
  });

  // H-2: show resolves → success + auto-dismiss timer
  it("transitions to success after a resolved show()", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    const submit = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      result.current.show(submit, payload);
      await Promise.resolve();
    });

    expect(result.current.state.kind).toBe("success");
    if (result.current.state.kind === "success") {
      expect(result.current.state.payload).toEqual(payload);
    }
  });

  // SC-004: auto-dismiss within ≤ 3 s
  it("auto-dismisses after ~2 s (within 3 s budget)", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    const submit = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      result.current.show(submit, payload);
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("success");

    act(() => { vi.advanceTimersByTime(2001); });
    expect(result.current.state.kind).toBe("idle");
  });

  // H-3: show rejects → error, no timer
  it("transitions to error after a rejected show() and starts no timer", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    const submit = vi.fn().mockRejectedValue(new Error("network error"));

    await act(async () => {
      result.current.show(submit, payload);
      await Promise.resolve();
    });

    expect(result.current.state.kind).toBe("error");
    if (result.current.state.kind === "error") {
      expect(result.current.state.reason).toBe("network error");
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  // SC-005: error does NOT auto-dismiss after 10 s
  it("error state persists after 10 s (no auto-dismiss)", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    const submit = vi.fn().mockRejectedValue(new Error("fail"));

    await act(async () => {
      result.current.show(submit, payload);
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("error");

    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.state.kind).toBe("error");
  });

  // H-4: new show() while in success replaces (no stacking)
  it("replace-not-stack: new show() while in success replaces state", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    const submit1 = vi.fn().mockResolvedValue(undefined);
    const submit2 = vi.fn().mockRejectedValue(new Error("second failed"));

    await act(async () => {
      result.current.show(submit1, payload);
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("success");

    await act(async () => {
      result.current.show(submit2, payload);
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("error");
    expect(vi.getTimerCount()).toBe(0); // prior timer was cleared
  });

  // H-5: dismiss() while in success cancels timer and returns to idle
  it("dismiss() from success cancels timer and returns to idle", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    const submit = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      result.current.show(submit, payload);
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("success");

    act(() => { result.current.dismiss(); });
    expect(result.current.state.kind).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });

  // H-6: dismiss() while in error returns to idle, no timer
  it("dismiss() from error returns to idle with no timer", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    const submit = vi.fn().mockRejectedValue(new Error("fail"));

    await act(async () => {
      result.current.show(submit, payload);
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("error");

    act(() => { result.current.dismiss(); });
    expect(result.current.state.kind).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });

  // H-7: retry() re-invokes captured submit with original payload
  it("retry() re-invokes original submit and resolves to success", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    const submit = vi.fn()
      .mockRejectedValueOnce(new Error("first fail"))
      .mockResolvedValueOnce(undefined);

    await act(async () => {
      result.current.show(submit, payload);
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("error");

    await act(async () => {
      result.current.retry();
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("success");
    expect(submit).toHaveBeenCalledTimes(2);
  });

  // H-8: retry() while in success/idle is a no-op
  it("retry() while in idle is a no-op", () => {
    const { result } = renderHook(() => useAccessEventFeedback());
    act(() => { result.current.retry(); });
    expect(result.current.state.kind).toBe("idle");
  });

  // H-9 / SC-011: 10× open/close stress — no leaked timers
  it("10x open/close stress: no orphan timers", async () => {
    const { result } = renderHook(() => useAccessEventFeedback());

    for (let i = 0; i < 10; i++) {
      const submit = vi.fn().mockResolvedValue(undefined);
      await act(async () => {
        result.current.show(submit, payload);
        await Promise.resolve();
      });
      act(() => {
        result.current.dismiss();
      });
    }

    expect(vi.getTimerCount()).toBe(0);
  });

  // H-9 / SC-011: unmount clears pending auto-dismiss timer
  it("unmount clears pending auto-dismiss timer", async () => {
    const { result, unmount } = renderHook(() => useAccessEventFeedback());
    const submit = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      result.current.show(submit, payload);
      await Promise.resolve();
    });
    expect(result.current.state.kind).toBe("success");
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
