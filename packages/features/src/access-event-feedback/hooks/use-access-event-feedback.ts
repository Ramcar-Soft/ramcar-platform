import { useState, useRef, useCallback, useEffect } from "react";
import type {
  AccessEventFeedbackState,
  AccessEventFeedbackController,
  AccessEventFeedbackPayload,
} from "../types";

const AUTO_DISMISS_MS = 2000;

export function useAccessEventFeedback(): AccessEventFeedbackController {
  const [state, setState] = useState<AccessEventFeedbackState>({ kind: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<AccessEventFeedbackState>(state);
  stateRef.current = state;

  // Cleanup timer on unmount (SC-011)
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const clearPendingTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // show is stable (empty deps) — timerRef and setState are stable references.
  // retryFn captures show via closure; by the time retryFn is invoked, show is
  // fully assigned, so the self-reference is valid.
  const show = useCallback(
    (submit: () => Promise<unknown>, payload: AccessEventFeedbackPayload): void => {
      clearPendingTimer();
      void submit().then(
        () => {
          clearPendingTimer();
          const autoDismissAt = Date.now() + AUTO_DISMISS_MS;
          setState({ kind: "success", payload, autoDismissAt });
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            setState({ kind: "idle" });
          }, AUTO_DISMISS_MS);
        },
        (err: unknown) => {
          clearPendingTimer();
          const reason = err instanceof Error ? err.message : String(err ?? "");
          setState({
            kind: "error",
            payload,
            reason,
            retryFn: () => {
              show(submit, payload);
              return Promise.resolve();
            },
          });
        },
      );
    },
    [],
  );

  const dismiss = useCallback((): void => {
    clearPendingTimer();
    setState({ kind: "idle" });
  }, []);

  const retry = useCallback((): void => {
    const current = stateRef.current;
    if (current.kind === "error") {
      void current.retryFn();
    }
  }, []);

  return { state, show, dismiss, retry };
}
