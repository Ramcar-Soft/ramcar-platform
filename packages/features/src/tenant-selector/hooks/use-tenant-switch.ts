import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../adapters/tenant-selector-adapters";
import { useUnsavedChanges } from "../../adapters/unsaved-changes";
import { useAnalytics } from "../../adapters/analytics";
import { useTenantList } from "./use-tenant-list";

interface TenantSwitchState {
  dialogOpen: boolean;
  targetId: string;
  targetName: string;
}

export function useTenantSwitch() {
  const { activeTenantId, activeTenantName, setActiveTenant } = useAuthStore();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const analytics = useAnalytics();
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenantList();
  const [state, setState] = useState<TenantSwitchState>({
    dialogOpen: false,
    targetId: "",
    targetName: "",
  });
  const confirmingRef = useRef(false);

  const onSelect = useCallback(
    (targetId: string) => {
      if (targetId === activeTenantId) return;
      const tenant = tenants.find((t) => t.id === targetId);
      if (!tenant) return;
      analytics.track("tenant_switch.opened", { from: activeTenantId, to: targetId });
      setState({
        dialogOpen: true,
        targetId,
        targetName: tenant.name,
      });
    },
    [activeTenantId, tenants, analytics],
  );

  const onCancel = useCallback(() => {
    analytics.track("tenant_switch.cancelled", { from: activeTenantId });
    setState((s) => ({ ...s, dialogOpen: false }));
  }, [activeTenantId, analytics]);

  const onConfirm = useCallback(() => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    analytics.track("tenant_switch.confirmed", { from: activeTenantId, to: state.targetId });
    void queryClient.cancelQueries();
    setActiveTenant(state.targetId, state.targetName);
    setState((s) => ({ ...s, dialogOpen: false }));
    setTimeout(() => {
      confirmingRef.current = false;
    }, 500);
  }, [queryClient, setActiveTenant, state.targetId, state.targetName, activeTenantId, analytics]);

  return {
    dialogOpen: state.dialogOpen,
    targetId: state.targetId,
    targetName: state.targetName,
    sourceTenantName: activeTenantName,
    hasUnsavedChanges: state.dialogOpen ? hasUnsavedChanges() : false,
    onSelect,
    onCancel,
    onConfirm,
  };
}
