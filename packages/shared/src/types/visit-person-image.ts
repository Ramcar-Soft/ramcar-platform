export type ImageType = "face" | "id_card" | "vehicle_plate" | "other";

export interface VisitPersonImage {
  id: string;
  tenantId: string;
  visitPersonId: string;
  imageType: ImageType;
  storagePath: string;
  signedUrl?: string;
  createdAt: string;
}
