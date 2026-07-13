"use client";

import type { ReactNode } from "react";
import { ReviewProvider } from "@/components/review/review-store";

/**
 * Envuelve toda la sección `/review` (cola y detalle) en el store de
 * decisiones, para que la selección y las decisiones se compartan mientras
 * se navega dentro del segmento sin recargar la página.
 */
export default function ReviewLayout({ children }: { children: ReactNode }) {
  return <ReviewProvider>{children}</ReviewProvider>;
}
