import { useAppStore } from "@ramcar/store";

const statusClass: Record<string, string> = {
  idle: "bg-green-500",
  syncing: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
  offline: "bg-gray-400",
};

export function SyncBadge() {
  const syncStatus = useAppStore((s) => s.syncStatus);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`inline-block size-2 rounded-full ${statusClass[syncStatus] ?? "bg-gray-400"}`}
      />
      <span className="capitalize">{syncStatus}</span>
    </div>
  );
}
