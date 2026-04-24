import { createContext, useContext, type ReactNode } from "react";

export type UnsavedChangesPort = {
  hasUnsavedChanges: () => boolean;
};

const defaultPort: UnsavedChangesPort = {
  hasUnsavedChanges: () => false,
};

const UnsavedChangesContext = createContext<UnsavedChangesPort>(defaultPort);

export function UnsavedChangesProvider({
  value,
  children,
}: {
  value: UnsavedChangesPort;
  children: ReactNode;
}) {
  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesPort {
  return useContext(UnsavedChangesContext);
}
