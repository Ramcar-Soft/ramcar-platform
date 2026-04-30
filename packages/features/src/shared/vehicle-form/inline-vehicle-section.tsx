import { Button, Input, Label, Separator } from "@ramcar/ui";
import { Loader2, X, CheckCircle2 } from "lucide-react";
import { useI18n, useRole } from "../../adapters";
import { VehicleTypeSelect } from "./vehicle-type-select";
import { ColorSelect } from "../color-select/color-select";
import { VehicleBrandSelect } from "../vehicle-brand-model/vehicle-brand-select";
import { VehicleModelSelect } from "../vehicle-brand-model/vehicle-model-select";
import { VehicleYearInput } from "../vehicle-brand-model/vehicle-year-input";
import type {
  InlineVehicleEntry,
  InlineVehicleEntryFields,
  OwnerKind,
} from "./inline-vehicle-types";

interface InlineVehicleSectionProps {
  ownerKind: OwnerKind;
  entries: InlineVehicleEntry[];
  onAddEntry: () => void;
  onRemoveEntry: (clientId: string) => void;
  onUpdateEntry: (clientId: string, patch: Partial<InlineVehicleEntryFields>) => void;
  disabled?: boolean;
  sectionTitleKey?: string;
}

interface EntryRowProps {
  entry: InlineVehicleEntry;
  disabled?: boolean;
  onRemove: () => void;
  onUpdate: (patch: Partial<InlineVehicleEntryFields>) => void;
}

function EntryRow({ entry, disabled, onRemove, onUpdate }: EntryRowProps) {
  const { t } = useI18n();
  const isSaved = entry.status === "saved";
  const isSaving = entry.status === "saving";
  const isReadOnly = isSaved || isSaving || disabled;

  return (
    <div className="rounded-md border p-3 space-y-3">
      {entry.errorMessage && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {entry.errorMessage}
        </p>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <Label>{t("vehicles.vehicleType.label")}</Label>
            <VehicleTypeSelect
              value={entry.vehicleType}
              onChange={(v) => onUpdate({ vehicleType: v })}
              disabled={isReadOnly}
            />
            {entry.fieldErrors?.vehicleType && (
              <p className="text-sm text-destructive">{entry.fieldErrors.vehicleType}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("vehicles.brand.label")}</Label>
            <VehicleBrandSelect
              value={entry.brand || null}
              onChange={(v) => {
                onUpdate({ brand: v ?? "", model: "" });
              }}
              disabled={isReadOnly}
            />
            {entry.fieldErrors?.brand && (
              <p className="text-sm text-destructive">{entry.fieldErrors.brand}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("vehicles.model.label")}</Label>
            <VehicleModelSelect
              brand={entry.brand || null}
              value={entry.model || null}
              onChange={(v) => onUpdate({ model: v ?? "" })}
              disabled={isReadOnly}
            />
            {entry.fieldErrors?.model && (
              <p className="text-sm text-destructive">{entry.fieldErrors.model}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("vehicles.plate.label")}</Label>
            <Input
              value={entry.plate}
              onChange={(e) => onUpdate({ plate: e.target.value })}
              placeholder={t("vehicles.plate.placeholder")}
              disabled={isReadOnly}
              aria-invalid={!!entry.fieldErrors?.plate}
            />
            {entry.fieldErrors?.plate && (
              <p className="text-sm text-destructive">{entry.fieldErrors.plate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("vehicles.color.label")}</Label>
            <ColorSelect
              value={entry.color || null}
              onChange={(hex) => onUpdate({ color: hex ?? "" })}
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("vehicles.year.label")}</Label>
            <VehicleYearInput
              value={entry.year}
              onChange={(v) => onUpdate({ year: v })}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="flex-shrink-0 pt-6">
          {isSaving && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("vehicles.inline.savingEntry")}
            </span>
          )}
          {isSaved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {t("vehicles.inline.savedEntry")}
              {entry.plate && (
                <span className="font-mono text-xs ml-1">{entry.plate}</span>
              )}
            </span>
          )}
          {(entry.status === "draft" || entry.status === "error") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
              aria-label={t("vehicles.inline.removeEntry")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InlineVehicleSection({
  ownerKind,
  entries,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntry,
  disabled,
  sectionTitleKey,
}: InlineVehicleSectionProps) {
  const { t } = useI18n();
  const { role } = useRole();

  // FR-008 defense-in-depth: guards cannot inline-create resident vehicles
  if (ownerKind === "resident" && role === "Guard") {
    return null;
  }

  const titleKey =
    sectionTitleKey ??
    (ownerKind === "resident"
      ? "vehicles.inline.sectionTitleResident"
      : "vehicles.inline.sectionTitle");

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t(titleKey)}</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddEntry}
          disabled={disabled}
        >
          {t("vehicles.inline.addEntry")}
        </Button>
      </div>

      {entries.map((entry) => (
        <EntryRow
          key={entry.clientId}
          entry={entry}
          disabled={disabled}
          onRemove={() => onRemoveEntry(entry.clientId)}
          onUpdate={(patch) => onUpdateEntry(entry.clientId, patch)}
        />
      ))}
    </div>
  );
}
