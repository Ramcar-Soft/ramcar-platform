import type { AccessEventListItem } from "@ramcar/shared";
import {
  CSV_BOM,
  getHeaderRow,
  itemToRow,
  quoteField,
  rowToCsv,
} from "../access-events.csv";

// ---------------------------------------------------------------------------
// quoteField
// ---------------------------------------------------------------------------

describe("quoteField", () => {
  it("returns a plain ASCII value unchanged", () => {
    expect(quoteField("hello")).toBe("hello");
  });

  it("wraps in double quotes when value contains a comma", () => {
    expect(quoteField("a,b")).toBe('"a,b"');
  });

  it("escapes internal double quotes by doubling them", () => {
    expect(quoteField('she said "hi"')).toBe('"she said ""hi"""');
  });

  it("quotes values containing newline characters", () => {
    expect(quoteField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("prefixes `=` with single quote to prevent formula injection", () => {
    expect(quoteField("=SUM(A1)")).toBe("'=SUM(A1)");
  });

  it("prefixes `+` with single quote to prevent formula injection", () => {
    expect(quoteField("+evil")).toBe("'+evil");
  });

  it("prefixes `-` with single quote to prevent formula injection", () => {
    expect(quoteField("-evil")).toBe("'-evil");
  });

  it("prefixes `@` with single quote to prevent formula injection", () => {
    expect(quoteField("@evil")).toBe("'@evil");
  });

  it("combines injection prefix and comma-quoting when needed", () => {
    expect(quoteField("=a,b")).toBe(`"'=a,b"`);
  });

  it("passes nullish values through as empty", () => {
    // @ts-expect-error — runtime guard against null input
    expect(quoteField(null)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// rowToCsv
// ---------------------------------------------------------------------------

describe("rowToCsv", () => {
  it("joins fields with commas and terminates with CRLF", () => {
    expect(rowToCsv(["a", "b", "c"])).toBe("a,b,c\r\n");
  });

  it("applies field quoting per field", () => {
    expect(rowToCsv(["hello, world", "ok"])).toBe('"hello, world",ok\r\n');
  });
});

// ---------------------------------------------------------------------------
// getHeaderRow
// ---------------------------------------------------------------------------

describe("getHeaderRow", () => {
  it("returns the English visitors header", () => {
    const row = getHeaderRow("visitor", "en", false);
    expect(row).toBe(
      "Code,Name,Direction,Resident visited,Vehicle,Status,Registered by,Date\r\n",
    );
  });

  it("returns the Spanish providers header", () => {
    const row = getHeaderRow("service_provider", "es", false);
    expect(row).toBe(
      "Código,Nombre,Empresa,Dirección,Vehículo,Estado,Registrado por,Fecha\r\n",
    );
  });

  it("returns the English residents header", () => {
    const row = getHeaderRow("resident", "en", false);
    expect(row).toBe(
      "Name,Unit,Direction,Mode,Vehicle,Registered by,Date\r\n",
    );
  });

  it("prepends Tenant column when showTenant is true", () => {
    const row = getHeaderRow("visitor", "en", true);
    expect(row.startsWith("Tenant,")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// itemToRow
// ---------------------------------------------------------------------------

function makeVisitorItem(
  overrides: Partial<AccessEventListItem> = {},
): AccessEventListItem {
  return {
    id: "e1",
    tenantId: "t1",
    tenantName: "Acme",
    personType: "visitor",
    direction: "entry",
    accessMode: "vehicle",
    notes: null,
    createdAt: "2026-04-22T12:00:00.000Z",
    visitPerson: {
      id: "vp1",
      code: "V-0001",
      fullName: "Jane Doe",
      phone: null,
      company: null,
      status: "allowed",
      residentId: "r1",
      residentFullName: "Host One",
    },
    resident: null,
    vehicle: {
      id: "car1",
      plate: "ABC-123",
      brand: "Toyota",
      model: "Corolla",
    },
    registeredBy: { id: "g1", fullName: "Guard Bob" },
    ...overrides,
  };
}

describe("itemToRow — visitors", () => {
  it("produces the 8-column visitor row in English", () => {
    const row = itemToRow(makeVisitorItem(), "visitor", "en", false);
    expect(row).toContain("V-0001");
    expect(row).toContain("Jane Doe");
    expect(row).toContain("Entry");
    expect(row).toContain("Host One");
    expect(row).toContain("ABC-123 — Toyota");
    expect(row).toContain("Allowed");
    expect(row).toContain("Guard Bob");
    expect(row.endsWith("\r\n")).toBe(true);
  });

  it("localises direction/status in Spanish", () => {
    const row = itemToRow(makeVisitorItem(), "visitor", "es", false);
    expect(row).toContain("Entrada");
    expect(row).toContain("Permitido");
  });

  it("omits vehicle for pedestrian access", () => {
    const row = itemToRow(
      makeVisitorItem({ accessMode: "pedestrian", vehicle: null }),
      "visitor",
      "en",
      false,
    );
    // Structure: code,name,dir,resident,VEHICLE,status,...
    const parts = row.replace(/\r\n$/, "").split(",");
    expect(parts[4]).toBe("");
  });

  it("prepends tenant name when showTenant is true", () => {
    const row = itemToRow(makeVisitorItem(), "visitor", "en", true);
    expect(row.startsWith("Acme,")).toBe(true);
  });

  it("quotes fields that contain commas", () => {
    const row = itemToRow(
      makeVisitorItem({
        visitPerson: {
          ...makeVisitorItem().visitPerson!,
          fullName: "Doe, Jane",
        },
      }),
      "visitor",
      "en",
      false,
    );
    expect(row).toContain('"Doe, Jane"');
  });

  it("applies CSV injection defence to dangerous first characters", () => {
    const row = itemToRow(
      makeVisitorItem({
        visitPerson: {
          ...makeVisitorItem().visitPerson!,
          fullName: "=HYPERLINK(x)",
        },
      }),
      "visitor",
      "en",
      false,
    );
    expect(row).toContain("'=HYPERLINK(x)");
  });
});

describe("itemToRow — providers", () => {
  it("produces 8-column provider row with company before direction", () => {
    const row = itemToRow(
      makeVisitorItem({
        personType: "service_provider",
        visitPerson: {
          ...makeVisitorItem().visitPerson!,
          company: "Widgets Co",
        },
      }),
      "service_provider",
      "en",
      false,
    );
    const parts = row.replace(/\r\n$/, "").split(",");
    // Columns: code, name, company, direction, vehicle, status, registeredBy, date
    expect(parts[0]).toBe("V-0001");
    expect(parts[2]).toBe("Widgets Co");
    expect(parts[3]).toBe("Entry");
  });
});

describe("itemToRow — residents", () => {
  function makeResidentItem(): AccessEventListItem {
    return {
      id: "e2",
      tenantId: "t1",
      tenantName: "Acme",
      personType: "resident",
      direction: "exit",
      accessMode: "pedestrian",
      notes: null,
      createdAt: "2026-04-22T12:00:00.000Z",
      visitPerson: null,
      resident: { id: "r1", fullName: "Alice", unit: "A-101" },
      vehicle: null,
      registeredBy: { id: "g1", fullName: "Guard Bob" },
    };
  }

  it("produces the 7-column resident row with Unit after Name", () => {
    const row = itemToRow(makeResidentItem(), "resident", "en", false);
    const parts = row.replace(/\r\n$/, "").split(",");
    // Columns: name, unit, direction, mode, vehicle, registeredBy, date
    expect(parts[0]).toBe("Alice");
    expect(parts[1]).toBe("A-101");
    expect(parts[2]).toBe("Exit");
    expect(parts[3]).toBe("Pedestrian");
    expect(parts[4]).toBe("");
  });
});

// ---------------------------------------------------------------------------
// BOM
// ---------------------------------------------------------------------------

describe("CSV_BOM", () => {
  it("is a single UTF-8 BOM character (\\uFEFF)", () => {
    expect(CSV_BOM).toBe("﻿");
    expect(CSV_BOM.length).toBe(1);
  });
});
