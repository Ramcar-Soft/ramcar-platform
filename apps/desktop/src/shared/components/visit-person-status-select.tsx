import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type { VisitPersonStatus } from "@ramcar/shared";

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
}

export function VisitPersonStatusSelect({
  value,
  onValueChange,
  id,
}: VisitPersonStatusSelectProps) {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as VisitPersonStatus)}>
      <SelectTrigger id={id}>
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
