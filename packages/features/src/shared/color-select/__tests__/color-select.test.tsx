import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithHarness } from "../../../test/harness";
import { ColorSelect } from "../color-select";

afterEach(() => cleanup());

describe("ColorSelect — trigger rendering", () => {
  it("shows the placeholder key when value is null", () => {
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    // The mock I18nPort returns the key itself.
    expect(screen.getByRole("button")).toHaveTextContent("vehicles.color.placeholder");
  });

  it("shows the catalog option key when value matches a curated HEX", () => {
    renderWithHarness(<ColorSelect value="#C8102E" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("vehicles.color.options.solid_red");
  });

  it("is case-insensitive on the value (lower-case hex resolves to catalog entry)", () => {
    renderWithHarness(<ColorSelect value="#c8102e" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("vehicles.color.options.solid_red");
  });

  it("renders a catalog swatch whose background matches the HEX", () => {
    renderWithHarness(<ColorSelect value="#C8102E" onChange={() => {}} />);
    const swatch = screen.getByTestId("color-select-swatch");
    expect(swatch).toHaveAttribute("data-variant", "flat");
    expect(swatch.style.backgroundColor).toBeTruthy();
  });

  it("shows the raw HEX as label when value is a custom HEX not in catalog", () => {
    renderWithHarness(<ColorSelect value="#7A4B2C" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("#7A4B2C");
    expect(screen.getByTestId("color-select-swatch")).toHaveAttribute("data-variant", "flat");
  });

  it("shows the raw string with legacy indicator when value is free text", () => {
    renderWithHarness(<ColorSelect value="blanco metalizado" onChange={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("blanco metalizado");
    expect(screen.getByTestId("color-select-swatch")).toHaveAttribute("data-variant", "legacy");
  });

  it("renders the chameleon swatch variant for an effect entry", () => {
    renderWithHarness(<ColorSelect value="#6E4E9E" onChange={() => {}} />);
    expect(screen.getByTestId("color-select-swatch")).toHaveAttribute("data-variant", "chameleon");
  });

  it("renders the chrome swatch variant for the chrome entry", () => {
    renderWithHarness(<ColorSelect value="#A8A9AD" onChange={() => {}} />);
    expect(screen.getByTestId("color-select-swatch")).toHaveAttribute("data-variant", "chrome");
  });

  it("applies the aria-label from the prop when provided", () => {
    renderWithHarness(
      <ColorSelect value={null} onChange={() => {}} ariaLabel="Vehicle color" />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Vehicle color");
  });

  it("respects the disabled prop", () => {
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onChange during render", () => {
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ColorSelect — open state + keyboard", () => {
  it("opens the popover when the trigger is clicked", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);

    await user.click(screen.getByRole("button"));

    expect(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
    ).toBeInTheDocument();
  });

  it("renders all 7 category group headers when opened", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    for (const cat of [
      "vehicles.color.categories.neutrals",
      "vehicles.color.categories.blues",
      "vehicles.color.categories.reds",
      "vehicles.color.categories.greens",
      "vehicles.color.categories.yellowsOranges",
      "vehicles.color.categories.earth",
      "vehicles.color.categories.premium",
    ]) {
      expect(screen.getByText(cat)).toBeInTheDocument();
    }
  });

  it("filters the list by localized label (EN)", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    await user.type(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
      "solid red",
    );

    expect(
      screen.getByText("vehicles.color.options.solid_red"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("vehicles.color.options.sky_blue"),
    ).not.toBeInTheDocument();
  });

  it("filters case- and accent-insensitively (ES token)", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    await user.type(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
      "cafe",
    );

    expect(
      screen.getByText("vehicles.color.options.dark_brown"),
    ).toBeInTheDocument();
  });

  it("filters by HEX substring", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    await user.type(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
      "#c8102e",
    );

    expect(
      screen.getByText("vehicles.color.options.solid_red"),
    ).toBeInTheDocument();
  });

  it("emits the HEX and closes when an item is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("vehicles.color.options.solid_red"));

    expect(onChange).toHaveBeenCalledWith("#C8102E");
    expect(
      screen.queryByPlaceholderText("vehicles.color.searchPlaceholder"),
    ).not.toBeInTheDocument();
  });

  it("emits the HEX when ArrowDown+Enter is used", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("shows the empty-state message when no catalog entry matches", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value={null} onChange={() => {}} />);
    await user.click(screen.getByRole("button"));

    await user.type(
      screen.getByPlaceholderText("vehicles.color.searchPlaceholder"),
      "zzzzzzzz",
    );

    expect(screen.getByText("vehicles.color.noResults")).toBeInTheDocument();
  });
});

describe("ColorSelect — Add custom color", () => {
  it("clicks the hidden <input type=color> when the Add-custom item is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));

    const hiddenInput = screen.getByTestId("color-select-native-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(hiddenInput, "click");

    await user.click(screen.getByText("vehicles.color.addCustom"));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits the HEX (uppercased) when the native picker fires a change event", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithHarness(<ColorSelect value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    const hiddenInput = screen.getByTestId("color-select-native-input") as HTMLInputElement;

    hiddenInput.value = "#7a4b2c";
    hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));

    expect(onChange).toHaveBeenCalledWith("#7A4B2C");
    expect(
      screen.queryByPlaceholderText("vehicles.color.searchPlaceholder"),
    ).not.toBeInTheDocument();
  });

  it("shows the 'Current' row when value is a custom HEX not in catalog", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value="#7A4B2C" onChange={() => {}} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("vehicles.color.current")).toBeInTheDocument();
  });

  it("does NOT show the 'Current' row when value is a catalog HEX", async () => {
    const user = userEvent.setup();
    renderWithHarness(<ColorSelect value="#C8102E" onChange={() => {}} />);

    await user.click(screen.getByRole("button"));

    expect(screen.queryByText("vehicles.color.current")).not.toBeInTheDocument();
  });
});
