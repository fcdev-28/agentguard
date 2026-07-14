"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { ActionStatus } from "@/domain";
import { actions as seedActions } from "@/data/demo-data";
import { currentUser } from "@/lib/session";
import { applyDecision, type ReviewDecision } from "@/lib/review";

/** Decisión humana registrada sobre una acción, para mostrarla en el detalle. */
export interface RecordedDecision {
  byId: string;
  byName: string;
  at: string;
  reason: string | null;
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

/** Estado inicial: cada acción semilla arranca con su status de `demo-data`. */
function buildInitialState(): ReviewState {
  const state: ReviewState = {};
  for (const action of seedActions) {
    state[action.id] = { status: action.status, decision: null };
  }
  return state;
}

function reviewReducer(state: ReviewState, action: DecideAction): ReviewState {
  const current = state[action.actionId];
  if (!current) return state;

  const result = applyDecision(current.status, action.decision, action.reason);
  if ("error" in result) return state;

  return {
    ...state,
    [action.actionId]: {
      status: result.status,
      decision: {
        byId: currentUser.id,
        byName: currentUser.name,
        at: new Date().toISOString(),
        reason: action.reason,
      },
    },
  };
}

interface ReviewContextValue {
  getActionState: (actionId: string) => ActionReviewState | undefined;
  decide: (
    actionId: string,
    decision: ReviewDecision,
    reason: string | null,
  ) => void;
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
