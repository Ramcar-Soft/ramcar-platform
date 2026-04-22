import {
  accessEventExportQuerySchema,
  type AccessEventExportQueryInput,
} from "@ramcar/shared";

export const exportAccessEventsSchema: typeof accessEventExportQuerySchema =
  accessEventExportQuerySchema;
export type ExportAccessEventsDto = AccessEventExportQueryInput;
