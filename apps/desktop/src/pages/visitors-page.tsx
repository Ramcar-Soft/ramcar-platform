import { VisitorsView } from "@ramcar/features/visitors";
import { SyncBadge } from "../shared/components/sync-badge";

export function VisitorsPage() {
  return <VisitorsView topRightSlot={<SyncBadge />} />;
}
