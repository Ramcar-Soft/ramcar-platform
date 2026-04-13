export type VisitPersonType = "visitor" | "service_provider";

export type VisitPersonStatus = "allowed" | "flagged" | "denied";

export interface VisitPerson {
  id: string;
  tenantId: string;
  code: string;
  type: VisitPersonType;
  status: VisitPersonStatus;
  fullName: string;
  phone: string | null;
  company: string | null;
  residentId: string | null;
  residentName?: string;
  notes: string | null;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
}
