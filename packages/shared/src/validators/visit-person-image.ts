import { z } from "zod";

export const imageTypeEnum = z.enum(["face", "id_card", "vehicle_plate", "other"]);

export type ImageTypeInput = z.infer<typeof imageTypeEnum>;
