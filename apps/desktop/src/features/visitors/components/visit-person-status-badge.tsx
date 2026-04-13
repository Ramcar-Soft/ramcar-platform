import { Badge } from "@ramcar/ui";
import { useTranslation } from "react-i18next";
import type { VisitPersonStatus } from "../types";

const statusVariantMap = {
  allowed: "default" as const,
  flagged: "warning" as const,
  denied: "destructive" as const,
};

interface VisitPersonStatusBadgeProps {
  status: VisitPersonStatus;
}

export function VisitPersonStatusBadge({ status }: VisitPersonStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={statusVariantMap[status]}>
      {t(`visitPersons.status.${status}`)}
    </Badge>
  );
}
