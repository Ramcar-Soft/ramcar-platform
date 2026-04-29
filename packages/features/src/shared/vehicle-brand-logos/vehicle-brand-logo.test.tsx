import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { VehicleBrandLogo } from "./vehicle-brand-logo";

afterEach(() => cleanup());

describe("VehicleBrandLogo — V1 known brand renders img", () => {
  it("renders an img with a resolved src for a known brand", () => {
    const { container } = render(<VehicleBrandLogo brand="Nissan" />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBeTruthy();
    expect(img.getAttribute("alt")).toBe("");
  });

  it("outer span is aria-hidden", () => {
    const { container } = render(<VehicleBrandLogo brand="Nissan" />);
    const span = container.firstChild as HTMLElement;
    expect(span.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("VehicleBrandLogo — V2 unknown brand renders placeholder", () => {
  it("renders a span with role=presentation for an unknown brand", () => {
    const { container } = render(<VehicleBrandLogo brand="Made-Up Brand" />);
    const placeholder = container.querySelector("[role='presentation']");
    expect(placeholder).toBeInTheDocument();
  });

  it("zero img elements for an unknown brand", () => {
    const { container } = render(<VehicleBrandLogo brand="Made-Up Brand" />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});

describe("VehicleBrandLogo — V3 null/undefined/empty render placeholder", () => {
  it("null brand renders placeholder", () => {
    const { container } = render(<VehicleBrandLogo brand={null} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelector("[role='presentation']")).toBeInTheDocument();
  });

  it("undefined brand renders placeholder", () => {
    const { container } = render(<VehicleBrandLogo brand={undefined} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("empty string brand renders placeholder", () => {
    const { container } = render(<VehicleBrandLogo brand="" />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("whitespace-only brand renders placeholder", () => {
    const { container } = render(<VehicleBrandLogo brand="   " />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});

describe("VehicleBrandLogo — V4 no layout shift (size classes)", () => {
  it("sm size applies w-8 h-8 classes to outer span for known brand", () => {
    const { container } = render(<VehicleBrandLogo brand="Nissan" size="sm" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("w-8");
    expect(span.className).toContain("h-8");
  });

  it("md size applies w-6 h-6 classes to outer span for known brand", () => {
    const { container } = render(<VehicleBrandLogo brand="Nissan" size="md" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("w-10");
    expect(span.className).toContain("h-10");
  });

  it("sm size applies w-8 h-8 to placeholder (unknown brand)", () => {
    const { container } = render(<VehicleBrandLogo brand="Unknown" size="sm" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("w-8");
    expect(span.className).toContain("h-8");
  });

  it("md size applies w-6 h-6 to placeholder (unknown brand)", () => {
    const { container } = render(<VehicleBrandLogo brand="Unknown" size="md" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("w-10");
    expect(span.className).toContain("h-10");
  });
});

describe("VehicleBrandLogo — V5 theme tile classes", () => {
  it("known brand outer span has white tile classes", () => {
    const { container } = render(<VehicleBrandLogo brand="Nissan" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("bg-white");
    expect(span.className).toContain("rounded");
  });

  it("unknown brand placeholder has muted tile class", () => {
    const { container } = render(<VehicleBrandLogo brand="Unknown" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("bg-muted");
    expect(span.className).toContain("rounded");
  });
});

describe("VehicleBrandLogo — V6 no img for unknown brand", () => {
  it("zero img tags for unknown brands (prevents 404)", () => {
    const unknownBrands = ["Ferrari", "Made-Up", null, undefined, ""];
    for (const brand of unknownBrands) {
      const { container } = render(<VehicleBrandLogo brand={brand} />);
      expect(container.querySelectorAll("img")).toHaveLength(0);
      cleanup();
    }
  });
});

describe("VehicleBrandLogo — V7 default size", () => {
  it("omitting size prop defaults to sm (w-8 h-8)", () => {
    const { container } = render(<VehicleBrandLogo brand="Nissan" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("w-8");
    expect(span.className).toContain("h-8");
    expect(span.className).not.toContain("w-10");
  });
});

describe("VehicleBrandLogo — V8 className composition", () => {
  it("consumer className is appended to the outer span", () => {
    const { container } = render(<VehicleBrandLogo brand="Nissan" className="ml-2" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("ml-2");
    expect(span.className).toContain("w-8");
  });

  it("consumer className on placeholder is also appended", () => {
    const { container } = render(<VehicleBrandLogo brand="Unknown" className="mr-1" />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain("mr-1");
  });
});

describe("VehicleBrandLogo — V9 no fetch on render", () => {
  it("mounting does not issue any fetch request", () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() => {
      throw new Error("No network calls allowed");
    });

    render(<VehicleBrandLogo brand="Nissan" />);
    render(<VehicleBrandLogo brand="Unknown" />);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("VehicleBrandLogo — V10 memoizable / pure render", () => {
  it("re-rendering with same props produces identical className", () => {
    const { container, rerender } = render(<VehicleBrandLogo brand="Toyota" size="sm" />);
    const firstClass = (container.firstChild as HTMLElement).className;

    rerender(<VehicleBrandLogo brand="Toyota" size="sm" />);
    const secondClass = (container.firstChild as HTMLElement).className;

    expect(firstClass).toBe(secondClass);
  });

  it("re-rendering with same unknown brand produces identical className", () => {
    const { container, rerender } = render(<VehicleBrandLogo brand="Unknown" size="md" />);
    const firstClass = (container.firstChild as HTMLElement).className;

    rerender(<VehicleBrandLogo brand="Unknown" size="md" />);
    const secondClass = (container.firstChild as HTMLElement).className;

    expect(firstClass).toBe(secondClass);
  });
});
