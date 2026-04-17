import { Badge } from "@ramcar/ui";
import { useI18n } from "../../adapters/i18n";
import type { VisitPersonStatus } from "../types";

const statusVariantMap: Record<VisitPersonStatus, "default" | "destructive" | "warning"> = {
  allowed: "default",
  flagged: "warning",
  denied: "destructive",
};

interface VisitPersonStatusBadgeProps {
  status: VisitPersonStatus;
}

export function VisitPersonStatusBadge({ status }: VisitPersonStatusBadgeProps) {
  const { t } = useI18n();

  return (
    <Badge variant={statusVariantMap[status]}>
      {t(`visitPersons.status.${status}`)}
    </Badge>
  );
}
