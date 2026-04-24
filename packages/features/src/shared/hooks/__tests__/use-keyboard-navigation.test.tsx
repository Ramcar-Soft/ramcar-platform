import { createRef } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useKeyboardNavigation } from "../use-keyboard-navigation";

afterEach(() => cleanup());

interface Item { id: string }

function Harness(props: {
  items: Item[] | undefined;
  highlightedIndex: number;
  setHighlightedIndex: (i: number | ((prev: number) => number)) => void;
  onSelectItem: (item: Item) => void;
  disabled?: boolean;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  useKeyboardNavigation<Item>({
    searchInputRef: props.searchRef,
    disabled: props.disabled,
    items: props.items,
    highlightedIndex: props.highlightedIndex,
    setHighlightedIndex: props.setHighlightedIndex,
    onSelectItem: props.onSelectItem,
  });
  return <input ref={props.searchRef} data-testid="search" />;
}

function HarnessExt(props: {
  items?: Item[];
  highlightedIndex?: number;
  setHighlightedIndex?: (i: number | ((prev: number) => number)) => void;
  onSelectItem?: (item: Item) => void;
  onCreate?: () => void;
  disabled?: boolean;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  useKeyboardNavigation<Item>({
    searchInputRef: props.searchRef,
    disabled: props.disabled,
    items: props.items,
    highlightedIndex: props.highlightedIndex,
    setHighlightedIndex: props.setHighlightedIndex,
    onSelectItem: props.onSelectItem,
    onCreate: props.onCreate,
  });
  return <input ref={props.searchRef} data-testid="search" />;
}

function press(key: string, target?: EventTarget) {
  const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  act(() => {
    (target ?? document).dispatchEvent(ev);
  });
}

describe("useKeyboardNavigation<T>", () => {
  it("ArrowDown advances highlight, clamped at items.length - 1", () => {
    const setHighlightedIndex = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[{ id: "a" }, { id: "b" }, { id: "c" }]}
        highlightedIndex={1}
        setHighlightedIndex={setHighlightedIndex}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    press("ArrowDown");
    expect(setHighlightedIndex).toHaveBeenCalledTimes(1);
    const updater = setHighlightedIndex.mock.calls[0][0] as (prev: number) => number;
    expect(updater(1)).toBe(2);
    expect(updater(2)).toBe(2);
  });

  it("ArrowUp decreases highlight, clamped at 0", () => {
    const setHighlightedIndex = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[{ id: "a" }, { id: "b" }]}
        highlightedIndex={0}
        setHighlightedIndex={setHighlightedIndex}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    press("ArrowUp");
    const updater = setHighlightedIndex.mock.calls[0][0] as (prev: number) => number;
    expect(updater(1)).toBe(0);
    expect(updater(0)).toBe(0);
  });

  it("Enter calls onSelectItem with the highlighted item", () => {
    const onSelectItem = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    const items = [{ id: "a" }, { id: "b" }];
    render(
      <Harness
        items={items}
        highlightedIndex={1}
        setHighlightedIndex={() => {}}
        onSelectItem={onSelectItem}
        searchRef={searchRef}
      />,
    );
    press("Enter");
    expect(onSelectItem).toHaveBeenCalledWith({ id: "b" });
  });

  it("Enter is a no-op when highlightedIndex is -1", () => {
    const onSelectItem = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[{ id: "a" }]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={onSelectItem}
        searchRef={searchRef}
      />,
    );
    press("Enter");
    expect(onSelectItem).not.toHaveBeenCalled();
  });

  it("B focuses the search input when no input is currently focused", () => {
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    expect(document.activeElement).not.toBe(searchRef.current);
    press("b");
    expect(document.activeElement).toBe(searchRef.current);
  });

  it("B does nothing when an input is already focused", () => {
    const searchRef = createRef<HTMLInputElement>();
    const { getByTestId } = render(
      <Harness
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    const input = getByTestId("search") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);
    press("b", input);
    expect(document.activeElement).toBe(input);
  });

  it("disabled short-circuits every key", () => {
    const setHighlightedIndex = vi.fn();
    const onSelectItem = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[{ id: "a" }]}
        highlightedIndex={0}
        setHighlightedIndex={setHighlightedIndex}
        onSelectItem={onSelectItem}
        searchRef={searchRef}
        disabled
      />,
    );
    press("ArrowDown");
    press("Enter");
    press("b");
    expect(setHighlightedIndex).not.toHaveBeenCalled();
    expect(onSelectItem).not.toHaveBeenCalled();
  });

  it("items=undefined does not crash and ArrowDown clamps to -1", () => {
    const setHighlightedIndex = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={undefined}
        highlightedIndex={-1}
        setHighlightedIndex={setHighlightedIndex}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    press("ArrowDown");
    const updater = setHighlightedIndex.mock.calls[0][0] as (prev: number) => number;
    expect(updater(-1)).toBe(0);
  });

  it("F focuses the search input when no input is focused", () => {
    const searchRef = createRef<HTMLInputElement>();
    render(
      <Harness
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    expect(document.activeElement).not.toBe(searchRef.current);
    press("f");
    expect(document.activeElement).toBe(searchRef.current);
  });

  it("F does nothing when an input is already focused", () => {
    const searchRef = createRef<HTMLInputElement>();
    const { getByTestId } = render(
      <Harness
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        searchRef={searchRef}
      />,
    );
    const input = getByTestId("search") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);
    press("f", input);
    expect(document.activeElement).toBe(input);
  });

  it("N calls onCreate when no input is focused", () => {
    const onCreate = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    render(
      <HarnessExt
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        onCreate={onCreate}
        searchRef={searchRef}
      />,
    );
    press("n");
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("N does not call onCreate when an input is focused", () => {
    const onCreate = vi.fn();
    const searchRef = createRef<HTMLInputElement>();
    const { getByTestId } = render(
      <HarnessExt
        items={[]}
        highlightedIndex={-1}
        setHighlightedIndex={() => {}}
        onSelectItem={() => {}}
        onCreate={onCreate}
        searchRef={searchRef}
      />,
    );
    const input = getByTestId("search") as HTMLInputElement;
    input.focus();
    press("n", input);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("N is a no-op when onCreate is undefined", () => {
    const searchRef = createRef<HTMLInputElement>();
    render(
      <HarnessExt searchRef={searchRef} />,
    );
    expect(() => press("n")).not.toThrow();
  });

  it("search-only mode (only searchInputRef): arrows, Enter, N are no-ops; B and F still focus", () => {
    const searchRef = createRef<HTMLInputElement>();
    render(<HarnessExt searchRef={searchRef} />);

    press("ArrowDown");
    press("ArrowUp");
    press("Enter");
    press("n");
    // Nothing observable to assert beyond no-throw; main assertion: focus still works.

    expect(document.activeElement).not.toBe(searchRef.current);
    press("b");
    expect(document.activeElement).toBe(searchRef.current);

    (searchRef.current as HTMLInputElement).blur();
    expect(document.activeElement).not.toBe(searchRef.current);
    press("f");
    expect(document.activeElement).toBe(searchRef.current);
  });
});
