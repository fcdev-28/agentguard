"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { ActionStatus } from "@/domain";
import { actions as seedActions, users } from "@/data/demo-data";
import { currentUser } from "@/lib/session";
import { applyDecision, type ReviewDecision } from "@/lib/review";

/** Usuario al que se ha escalado una acción, para mostrarlo en el detalle. */
export interface EscalationTarget {
  id: string;
  name: string;
}

/** Decisión humana registrada sobre una acción, para mostrarla en el detalle. */
export interface RecordedDecision {
  byId: string;
  byName: string;
  at: string;
  reason: string | null;
  escalatedTo: EscalationTarget | null;
}

/** Estado de una acción dentro del store: su status actual y la última decisión. */
export interface ActionReviewState {
  status: ActionStatus;
  decision: RecordedDecision | null;
}

type ReviewState = Record<string, ActionReviewState>;

interface DecideAction {
  type: "decide";
  actionId: string;
  decision: ReviewDecision;
  reason: string | null;
}

interface DecideManyAction {
  type: "decideMany";
  actionIds: string[];
  decision: ReviewDecision;
  reason: string | null;
}

interface EscalateAction {
  type: "escalate";
  actionId: string;
  toUserId: string;
}

type ReviewStoreAction = DecideAction | DecideManyAction | EscalateAction;

/** Estado inicial: cada acción semilla arranca con su status de `demo-data`. */
function buildInitialState(): ReviewState {
  const state: ReviewState = {};
  for (const action of seedActions) {
    state[action.id] = { status: action.status, decision: null };
  }
  return state;
}

/** Aplica una decisión a una acción del estado; devuelve el mismo estado si no procede. */
function applyDecisionToState(
  state: ReviewState,
  actionId: string,
  decision: ReviewDecision,
  reason: string | null,
  escalatedTo: EscalationTarget | null,
): ReviewState {
  const current = state[actionId];
  if (!current) return state;

  const result = applyDecision(current.status, decision, reason);
  if ("error" in result) return state;

  return {
    ...state,
    [actionId]: {
      status: result.status,
      decision: {
        byId: currentUser.id,
        byName: currentUser.name,
        at: new Date().toISOString(),
        reason,
        escalatedTo,
      },
    },
  };
}

function reviewReducer(
  state: ReviewState,
  action: ReviewStoreAction,
): ReviewState {
  switch (action.type) {
    case "decide":
      return applyDecisionToState(
        state,
        action.actionId,
        action.decision,
        action.reason,
        null,
      );
    case "decideMany":
      return action.actionIds.reduce(
        (next, actionId) =>
          applyDecisionToState(
            next,
            actionId,
            action.decision,
            action.reason,
            null,
          ),
        state,
      );
    case "escalate": {
      const target = users.find((u) => u.id === action.toUserId);
      if (!target) return state;
      return applyDecisionToState(state, action.actionId, "escalated", null, {
        id: target.id,
        name: target.name,
      });
    }
    default:
      return state;
  }
}

interface ReviewContextValue {
  getActionState: (actionId: string) => ActionReviewState | undefined;
  decide: (
    actionId: string,
    decision: ReviewDecision,
    reason: string | null,
  ) => void;
  decideMany: (
    actionIds: string[],
    decision: ReviewDecision,
    reason: string | null,
  ) => void;
  escalate: (actionId: string, toUserId: string) => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

/**
 * Store efímero (no persistido) de las decisiones de revisión. Se siembra a
 * partir de `demo-data` y vive mientras dure la navegación por `/review`;
 * al llegar la persistencia real (fase 10) se sustituye por consultas y
 * mutaciones contra la base de datos.
 */
export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    reviewReducer,
    undefined,
    buildInitialState,
  );

  const value = useMemo<ReviewContextValue>(
    () => ({
      getActionState: (actionId) => state[actionId],
      decide: (actionId, decision, reason) =>
        dispatch({ type: "decide", actionId, decision, reason }),
      decideMany: (actionIds, decision, reason) =>
        dispatch({ type: "decideMany", actionIds, decision, reason }),
      escalate: (actionId, toUserId) =>
        dispatch({ type: "escalate", actionId, toUserId }),
    }),
    [state],
  );

  return (
    <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>
  );
}

/** Acceso al store de revisión; debe usarse bajo el segmento `/review`. */
export function useReview(): ReviewContextValue {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error("useReview debe usarse dentro de <ReviewProvider>.");
  }
  return context;
}
