export type TranslationStatus =
  | "unsupported"
  | "ready"
  | "discovering"
  | "processing"
  | "paused"
  | "completed"
  | "completed-with-errors"
  | "cancelled"
  | "error";

export type TranslationState = { status: TranslationStatus };

export type TranslationAction =
  | { type: "START" }
  | { type: "DISCOVERY_COMPLETE" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "CANCEL" }
  | { type: "COMPLETE" }
  | { type: "ERROR" };

export function transition(state: TranslationState, action: TranslationAction): TranslationState {
  switch (action.type) {
    case "START":
      return state.status === "ready" ? { status: "discovering" } : state;
    case "DISCOVERY_COMPLETE":
      return state.status === "discovering" ? { status: "processing" } : state;
    case "PAUSE":
      return state.status === "processing" ? { status: "paused" } : state;
    case "RESUME":
      return state.status === "paused" ? { status: "processing" } : state;
    case "CANCEL":
      return ["discovering", "processing", "paused"].includes(state.status)
        ? { status: "cancelled" }
        : state;
    case "COMPLETE":
      return state.status === "processing" ? { status: "completed" } : state;
    case "ERROR":
      return ["discovering", "processing"].includes(state.status) ? { status: "error" } : state;
  }
}
