/**
 * Logging estructurado propio: registros JSON a stdout/stderr. Las métricas
 * son registros de log con campo `metric` (un counter = una línea por
 * ocurrencia); el destino de logs agrega. Núcleo puro (`buildLogRecord`,
 * `shouldLog`) testeable sin I/O. Edge-safe: usa `console.*`, no `process.stdout`.
 * Regla: en labels solo IDs y tipos/estados; nunca payloads, cuerpos, secretos.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface LogRecord {
  ts: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const VALID_LEVELS: ReadonlySet<string> = new Set(Object.keys(LEVEL_ORDER));

/** Construye el registro. `ts`/`level`/`msg` van tras el spread: `fields` no los pisa. */
export function buildLogRecord(
  level: LogLevel,
  msg: string,
  fields?: LogFields,
  now: Date = new Date(),
): LogRecord {
  return { ...fields, ts: now.toISOString(), level, msg };
}

export function shouldLog(
  configLevel: LogLevel,
  recordLevel: LogLevel,
): boolean {
  return LEVEL_ORDER[recordLevel] >= LEVEL_ORDER[configLevel];
}

/** Nivel de entorno, resuelto por llamada. Inválido/ausente → "info". */
function configuredLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  return raw && VALID_LEVELS.has(raw) ? (raw as LogLevel) : "info";
}

function write(level: LogLevel, msg: string, fields?: LogFields): void {
  if (!shouldLog(configuredLevel(), level)) return;
  const line = JSON.stringify(buildLogRecord(level, msg, fields));
  if (level === "warn" || level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => write("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};

/** Evento de métrica: record nivel info con `metric: name` + labels. +1 al counter. */
export function metric(name: string, labels?: LogFields): void {
  // `metric` va tras el spread: un label homónimo no puede pisar el nombre.
  write("info", name, { ...labels, metric: name });
}
