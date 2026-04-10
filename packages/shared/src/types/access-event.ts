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
