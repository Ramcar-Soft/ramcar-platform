import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFormPersistence } from "./use-form-persistence";

const STORAGE_PREFIX = "ramcar-draft:";

function getStored(key: string) {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
  return raw ? JSON.parse(raw) : null;
}

function setStored(key: string, data: unknown, savedAt = Date.now()) {
  localStorage.setItem(
    `${STORAGE_PREFIX}${key}`,
    JSON.stringify({ data, savedAt }),
  );
}

describe("useFormPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves form data to localStorage after debounce", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ data }) =>
        useFormPersistence("test-form", data, { onRestore }),
      { initialProps: { data: { name: "" } } },
    );

    rerender({ data: { name: "Alice" } });
    expect(getStored("test-form")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const stored = getStored("test-form");
    expect(stored.data).toEqual({ name: "Alice" });
    expect(stored.savedAt).toBeTypeOf("number");
  });

  it("restores draft on mount and calls onRestore", () => {
    setStored("test-form", { name: "Bob" });
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    expect(onRestore).toHaveBeenCalledWith({ name: "Bob" });
    expect(result.current.wasRestored).toBe(true);
  });

  it("does not restore if no draft exists", () => {
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    expect(onRestore).not.toHaveBeenCalled();
    expect(result.current.wasRestored).toBe(false);
  });

  it("clearDraft removes draft from localStorage", () => {
    setStored("test-form", { name: "Bob" });
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(`${STORAGE_PREFIX}test-form`)).toBeNull();
  });

  it("discardDraft removes draft and resets wasRestored", () => {
    setStored("test-form", { name: "Bob" });
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    expect(result.current.wasRestored).toBe(true);

    act(() => {
      result.current.discardDraft();
    });

    expect(localStorage.getItem(`${STORAGE_PREFIX}test-form`)).toBeNull();
    expect(result.current.wasRestored).toBe(false);
  });

  it("strips excludeFields before saving", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ data }) =>
        useFormPersistence("test-form", data, {
          onRestore,
          excludeFields: ["password", "confirmPassword"],
        }),
      {
        initialProps: {
          data: { name: "Alice", password: "secret", confirmPassword: "secret" },
        },
      },
    );

    rerender({
      data: { name: "Alice", password: "secret", confirmPassword: "secret" },
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const stored = getStored("test-form");
    expect(stored.data).toEqual({ name: "Alice" });
    expect(stored.data.password).toBeUndefined();
    expect(stored.data.confirmPassword).toBeUndefined();
  });

  it("handles corrupted localStorage data gracefully", () => {
    localStorage.setItem(`${STORAGE_PREFIX}test-form`, "not-valid-json{{{");
    const onRestore = vi.fn();

    const { result } = renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    expect(onRestore).not.toHaveBeenCalled();
    expect(result.current.wasRestored).toBe(false);
    expect(localStorage.getItem(`${STORAGE_PREFIX}test-form`)).toBeNull();
  });

  it("cancels debounce timer on unmount", () => {
    const onRestore = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ data }) =>
        useFormPersistence("test-form", data, { onRestore }),
      { initialProps: { data: { name: "" } } },
    );

    rerender({ data: { name: "Alice" } });
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(getStored("test-form")).toBeNull();
  });

  it("uses custom debounceMs when provided", () => {
    const onRestore = vi.fn();
    const { rerender } = renderHook(
      ({ data }) =>
        useFormPersistence("test-form", data, {
          onRestore,
          debounceMs: 500,
        }),
      { initialProps: { data: { name: "" } } },
    );

    rerender({ data: { name: "Alice" } });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(getStored("test-form")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getStored("test-form")?.data).toEqual({ name: "Alice" });
  });

  it("does not save initial render data as a draft", () => {
    const onRestore = vi.fn();
    renderHook(() =>
      useFormPersistence("test-form", { name: "" }, { onRestore }),
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(getStored("test-form")).toBeNull();
  });
});
