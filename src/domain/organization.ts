/** Empresa o espacio de trabajo. Raíz de todos los datos. */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  /** Parada de emergencia global activa (ver docs/FEATURES.md). */
  emergencyStop: boolean;
  emergencyStopById: string | null;
  emergencyStopAt: string | null;
  createdAt: string;
  updatedAt: string;
}
