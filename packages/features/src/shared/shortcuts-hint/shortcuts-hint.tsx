import { cn } from "@ramcar/ui";
import { useI18n } from "../../adapters/i18n";

export interface ShortcutsHintProps {
  search?: boolean;
  navigate?: boolean;
  select?: boolean;
  create?: boolean;
  className?: string;
}

const KBD_CLASS =
  "inline-flex items-center justify-center h-5 min-w-5 px-1 rounded border bg-background font-mono text-[11px] text-foreground";

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className={KBD_CLASS}>{children}</kbd>;
}

export function ShortcutsHint({
  search,
  navigate,
  select,
  create,
  className,
}: ShortcutsHintProps) {
  const { t } = useI18n();

  if (!search && !navigate && !select && !create) {
    return null;
  }

  return (
    <div
      aria-label={t("shortcuts.ariaLabel")}
      className={cn(
        "inline-flex flex-wrap items-center gap-3 text-xs text-muted-foreground",
        className,
      )}
    >
      {search && (
        <span className="inline-flex items-center gap-1">
          <Kbd>B</Kbd>
          <span aria-hidden>/</span>
          <Kbd>F</Kbd>
          <span>{t("shortcuts.search")}</span>
        </span>
      )}
      {navigate && (
        <span className="inline-flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>{t("shortcuts.navigate")}</span>
        </span>
      )}
      {select && (
        <span className="inline-flex items-center gap-1">
          <Kbd>↵</Kbd>
          <span>{t("shortcuts.select")}</span>
        </span>
      )}
      {create && (
        <span className="inline-flex items-center gap-1">
          <Kbd>N</Kbd>
          <span>{t("shortcuts.create")}</span>
        </span>
      )}
    </div>
  );
}
