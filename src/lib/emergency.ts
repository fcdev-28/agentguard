/**
 * Guarda pura de la parada de emergencia. Hoy solo bloquea la aprobación en
 * la UI; cuando exista ejecución real de acciones (fase 2+) esta misma
 * función decidirá si una `AgentAction` puede pasar a `executed`.
 */
export function canExecute(emergencyStopActive: boolean): boolean {
  return !emergencyStopActive;
}
