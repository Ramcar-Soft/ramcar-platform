import type { Direction, AccessMode } from "@ramcar/shared";

export interface AccessEventFeedbackPayload {
  personName: string;
  direction: Direction;
  accessMode: AccessMode;
}

export type AccessEventFeedbackState =
  | { kind: "idle" }
  | {
      kind: "success";
      payload: AccessEventFeedbackPayload;
      /** Wall-clock ms timestamp when the auto-dismiss fires. Used by tests. */
      autoDismissAt: number;
    }
  | {
      kind: "error";
      payload: AccessEventFeedbackPayload;
      reason: string;
      retryFn: () => Promise<unknown>;
    };

export interface AccessEventFeedbackController {
  state: AccessEventFeedbackState;
  show(submit: () => Promise<unknown>, payload: AccessEventFeedbackPayload): void;
  dismiss(): void;
  retry(): void;
}

export interface AccessEventFeedbackOverlayProps {
  controller: AccessEventFeedbackController;
}
