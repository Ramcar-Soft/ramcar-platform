import type { PaginationMeta } from "./user";
import type { VisitPersonStatus } from "./visit-person";

export type Direction = "entry" | "exit";

export type AccessMode = "vehicle" | "pedestrian";

export type PersonType = "visitor" | "service_provider" | "resident";

export type AccessEventSource = "web" | "desktop" | "mobile";

export interface AccessEvent {
  id: string;
  eventId: string;
  tenantId: string;
  personType: PersonType;
  userId: string | null;
  visitPersonId: string | null;
  direction: Direction;
  accessMode: AccessMode;
  vehicleId: string | null;
  registeredBy: string;
  notes: string | null;
  source: AccessEventSource;
  createdAt: string;
}

export interface AccessEventListItem {
  id: string;
  tenantId: string;
  tenantName: string | null;
  personType: PersonType;
  direction: Direction;
  accessMode: AccessMode;
  notes: string | null;
  createdAt: string;
  visitPerson: {
    id: string;
    code: string;
    fullName: string;
    phone: string | null;
    company: string | null;
    status: VisitPersonStatus;
    residentId: string | null;
    residentFullName: string | null;
  } | null;
  resident: {
    id: string;
    fullName: string;
    unit: string | null;
  } | null;
  vehicle: {
    id: string;
    plate: string | null;
    brand: string | null;
    model: string | null;
  } | null;
  registeredBy: {
    id: string;
    fullName: string;
  };
}

export interface AccessEventListResponse {
  data: AccessEventListItem[];
  meta: PaginationMeta;
}

export const LOGBOOK_CSV_LABELS = {
  en: {
    visitors: {
      columns: ["Code", "Name", "Direction", "Resident visited", "Vehicle", "Status", "Registered by", "Notes", "Date"],
    },
    providers: {
      columns: ["Code", "Name", "Company", "Direction", "Vehicle", "Status", "Registered by", "Notes", "Date"],
    },
    residents: {
      columns: ["Name", "Unit", "Direction", "Mode", "Vehicle", "Registered by", "Notes", "Date"],
    },
    direction: { entry: "Entry", exit: "Exit" },
    accessMode: { vehicle: "Vehicle", pedestrian: "Pedestrian" },
    status: { allowed: "Allowed", flagged: "Flagged", denied: "Denied" },
  },
  es: {
    visitors: {
      columns: ["Código", "Nombre", "Dirección", "Residente visitado", "Vehículo", "Estado", "Registrado por", "Notas", "Fecha"],
    },
    providers: {
      columns: ["Código", "Nombre", "Empresa", "Dirección", "Vehículo", "Estado", "Registrado por", "Notas", "Fecha"],
    },
    residents: {
      columns: ["Nombre", "Unidad", "Dirección", "Modo", "Vehículo", "Registrado por", "Notas", "Fecha"],
    },
    direction: { entry: "Entrada", exit: "Salida" },
    accessMode: { vehicle: "Vehículo", pedestrian: "Peatón" },
    status: { allowed: "Permitido", flagged: "Marcado", denied: "Denegado" },
  },
} as const;

export type LogbookLocale = keyof typeof LOGBOOK_CSV_LABELS;
