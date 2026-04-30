import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createVehicleSchema, type Vehicle } from "@ramcar/shared";
import { useTransport, useRole, useI18n } from "../../adapters";
import type {
  InlineVehicleEntry,
  InlineVehicleEntryFields,
  OwnerKind,
} from "./inline-vehicle-types";

function makeEntry(fields: InlineVehicleEntryFields): InlineVehicleEntry {
  return { ...fields, status: "draft" };
}

function newFields(): InlineVehicleEntryFields {
  return {
    clientId: crypto.randomUUID(),
    vehicleType: "",
    brand: "",
    model: "",
    plate: "",
    color: "",
    year: null,
    notes: "",
  };
}

export function useInlineVehicleSubmissions(
  initialEntries?: InlineVehicleEntryFields[],
) {
  const transport = useTransport();
  const queryClient = useQueryClient();
  const { tenantId } = useRole();
  const { t } = useI18n();

  const [entries, setEntries] = useState<InlineVehicleEntry[]>(
    () => (initialEntries ?? []).map(makeEntry),
  );
  const isSubmittingRef = useRef(false);

  const isSubmittingAny = entries.some((e) => e.status === "saving");
  const allSaved =
    entries.length > 0 && entries.every((e) => e.status === "saved");

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, makeEntry(newFields())]);
  }, []);

  const removeEntry = useCallback((clientId: string) => {
    setEntries((prev) => prev.filter((e) => e.clientId !== clientId));
  }, []);

  const updateEntry = useCallback(
    (clientId: string, patch: Partial<InlineVehicleEntryFields>) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.clientId === clientId ? { ...e, ...patch } : e,
        ),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    isSubmittingRef.current = false;
    setEntries([]);
  }, []);

  const submitAll = useCallback(
    async (
      personId: string,
      ownerKind: OwnerKind,
    ): Promise<{ saved: InlineVehicleEntry[]; failed: InlineVehicleEntry[] }> => {
      if (isSubmittingRef.current) {
        throw new Error("useInlineVehicleSubmissions: submitAll called concurrently");
      }
      isSubmittingRef.current = true;

      const saved: InlineVehicleEntry[] = [];
      const failed: InlineVehicleEntry[] = [];

      // Capture snapshot — we'll iterate over entries eligible for submission
      const snapshot = [...entries];

      for (const entry of snapshot) {
        // Skip already-saved entries
        if (entry.status === "saved") {
          saved.push(entry);
          continue;
        }
        // Skip empty vehicleType silently
        if (!entry.vehicleType) {
          continue;
        }

        // Build payload
        const ownerFields =
          ownerKind === "resident"
            ? { ownerType: "user" as const, userId: personId }
            : { ownerType: "visitPerson" as const, visitPersonId: personId };

        const parseResult = createVehicleSchema.safeParse({
          ...ownerFields,
          vehicleType: entry.vehicleType,
          brand: entry.brand || undefined,
          model: entry.model || undefined,
          plate: entry.plate || undefined,
          color: entry.color || undefined,
          notes: entry.notes || undefined,
          year: entry.year ?? undefined,
        });

        if (!parseResult.success) {
          const fieldErrors: InlineVehicleEntry["fieldErrors"] = {};
          for (const issue of parseResult.error.issues) {
            const field = issue.path[0] as keyof InlineVehicleEntryFields | undefined;
            if (field) fieldErrors[field] = issue.message;
          }
          setEntries((prev) =>
            prev.map((e) =>
              e.clientId === entry.clientId
                ? { ...e, status: "draft", fieldErrors }
                : e,
            ),
          );
          failed.push({ ...entry, status: "draft", fieldErrors });
          continue;
        }

        // Mark saving
        setEntries((prev) =>
          prev.map((e) =>
            e.clientId === entry.clientId
              ? { ...e, status: "saving", fieldErrors: undefined, errorMessage: undefined }
              : e,
          ),
        );

        try {
          const vehicle = await transport.post<Vehicle>("/vehicles", parseResult.data);
          const ownerId = personId;
          const cacheOwnerKind = ownerKind === "resident" ? "resident" : "visit-person";
          queryClient.invalidateQueries({
            queryKey: ["vehicles", tenantId, cacheOwnerKind, ownerId],
          });
          const savedEntry: InlineVehicleEntry = {
            ...entry,
            status: "saved",
            vehicleId: vehicle.id,
            errorMessage: undefined,
            fieldErrors: undefined,
          };
          setEntries((prev) =>
            prev.map((e) =>
              e.clientId === entry.clientId ? savedEntry : e,
            ),
          );
          saved.push(savedEntry);
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status;
          let errorMessage: string;
          let fieldErrors: InlineVehicleEntry["fieldErrors"] | undefined;

          if (status === 409) {
            errorMessage = t("vehicles.inline.errorPlateInUse");
            fieldErrors = { plate: t("vehicles.inline.errorPlateInUse") };
          } else if (status === 403) {
            errorMessage = t("vehicles.messages.forbidden");
          } else if (status === 400) {
            errorMessage = t("vehicles.messages.errorCreating");
            const body = (err as { body?: { errors?: Array<{ field: string; message: string }> } })?.body;
            if (body?.errors) {
              fieldErrors = {};
              for (const fe of body.errors) {
                const field = fe.field as keyof InlineVehicleEntryFields;
                fieldErrors[field] = fe.message;
              }
            }
          } else {
            errorMessage = t("vehicles.messages.errorCreating");
          }

          const errorEntry: InlineVehicleEntry = {
            ...entry,
            status: "error",
            errorMessage,
            fieldErrors,
          };
          setEntries((prev) =>
            prev.map((e) =>
              e.clientId === entry.clientId ? errorEntry : e,
            ),
          );
          failed.push(errorEntry);
        }
      }

      isSubmittingRef.current = false;
      return { saved, failed };
    },
    [entries, transport, queryClient, tenantId, t],
  );

  return {
    entries,
    isSubmittingAny,
    allSaved,
    addEntry,
    removeEntry,
    updateEntry,
    reset,
    submitAll,
  };
}
