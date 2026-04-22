import {
  accessEventListQuerySchema,
  type AccessEventListQueryInput,
} from "@ramcar/shared";

export const listAccessEventsSchema: typeof accessEventListQuerySchema =
  accessEventListQuerySchema;
export type ListAccessEventsDto = AccessEventListQueryInput;
