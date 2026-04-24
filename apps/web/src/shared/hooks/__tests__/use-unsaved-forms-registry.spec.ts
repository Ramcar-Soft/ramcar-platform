import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnsavedFormsStore, useRegisterUnsavedForm } from "../use-unsaved-forms-registry";

beforeEach(() => {
  // Reset Zustand store before each test
  useUnsavedFormsStore.getState().reset();
});

describe("useUnsavedFormsStore", () => {
  it("starts with no dirty forms", () => {
    const { result } = renderHook(() => useUnsavedFormsStore());
    expect(result.current.hasAny()).toBe(false);
  });

  it("register makes hasAny() return true", () => {
    const { result } = renderHook(() => useUnsavedFormsStore());

    act(() => {
      result.current.register("form-1");
    });

    expect(result.current.hasAny()).toBe(true);
  });

  it("deregister removes the form and hasAny() returns false when empty", () => {
    const { result } = renderHook(() => useUnsavedFormsStore());

    act(() => {
      result.current.register("form-1");
    });
    expect(result.current.hasAny()).toBe(true);

    act(() => {
      result.current.deregister("form-1");
    });
    expect(result.current.hasAny()).toBe(false);
  });

  it("hasAny() is true while at least one form is registered", () => {
    const { result } = renderHook(() => useUnsavedFormsStore());

    act(() => {
      result.current.register("form-1");
      result.current.register("form-2");
    });
    expect(result.current.hasAny()).toBe(true);

    act(() => {
      result.current.deregister("form-1");
    });
    expect(result.current.hasAny()).toBe(true);

    act(() => {
      result.current.deregister("form-2");
    });
    expect(result.current.hasAny()).toBe(false);
  });

  it("reset clears all dirty forms", () => {
    const { result } = renderHook(() => useUnsavedFormsStore());

    act(() => {
      result.current.register("form-1");
      result.current.register("form-2");
    });
    expect(result.current.hasAny()).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.hasAny()).toBe(false);
  });
});

describe("useRegisterUnsavedForm", () => {
  it("registers when isDirty=true and deregisters when isDirty=false", () => {
    const store = useUnsavedFormsStore.getState();

    const { rerender } = renderHook(
      ({ isDirty }: { isDirty: boolean }) => useRegisterUnsavedForm("form-test", isDirty),
      { initialProps: { isDirty: true } },
    );

    expect(store.hasAny()).toBe(true);

    rerender({ isDirty: false });
    expect(store.hasAny()).toBe(false);
  });

  it("deregisters on unmount", () => {
    const store = useUnsavedFormsStore.getState();

    const { unmount } = renderHook(() => useRegisterUnsavedForm("form-unmount", true));
    expect(store.hasAny()).toBe(true);

    unmount();
    expect(store.hasAny()).toBe(false);
  });

  it("reset on sign-out clears all dirty forms (simulating sign-out)", () => {
    const store = useUnsavedFormsStore.getState();

    act(() => {
      store.register("form-1");
    });
    expect(store.hasAny()).toBe(true);

    // Simulate sign-out by calling reset
    act(() => {
      store.reset();
    });
    expect(store.hasAny()).toBe(false);
  });
});
