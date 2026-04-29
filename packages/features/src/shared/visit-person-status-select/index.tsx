import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import type { VisitPersonStatus } from "@ramcar/shared";
import { useI18n } from "../../adapters";

const STATUSES: VisitPersonStatus[] = ["allowed", "flagged", "denied"];

const dotClass: Record<VisitPersonStatus, string> = {
  allowed: "bg-primary",
  flagged: "bg-warning",
  denied: "bg-destructive",
};

function StatusDot({ status }: { status: VisitPersonStatus }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 rounded-full ${dotClass[status]}`}
    />
  );
}

interface VisitPersonStatusSelectProps {
  value: VisitPersonStatus;
  onValueChange: (value: VisitPersonStatus) => void;
  id?: string;
  disabled?: boolean;
}

export function VisitPersonStatusSelect({
  value,
  onValueChange,
  id,
  disabled,
}: VisitPersonStatusSelectProps) {
  const { t } = useI18n();

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as VisitPersonStatus)}
      disabled={disabled}
    >
      <SelectTrigger id={id} data-testid="visit-person-status-select">
        <span className="flex items-center gap-2">
          <StatusDot status={value} />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="flex items-center gap-2">
              <StatusDot status={s} />
              {t(`visitPersons.status.${s}`)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
