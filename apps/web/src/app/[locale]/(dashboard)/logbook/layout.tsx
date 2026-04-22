import type { ReactNode } from "react";
import { LogbookShell } from "@/features/logbook";

export default function LogbookLayout({ children }: { children: ReactNode }) {
  return <LogbookShell>{children}</LogbookShell>;
}
