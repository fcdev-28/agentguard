import styles from "./key-value-view.module.css";

/** Un objeto plano (no array), tal como llegan payloads y metadata. */
type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNested(value: unknown): boolean {
  return isPlainObject(value) || Array.isArray(value);
}

/** Formatea una clave técnica de forma amable: sin guiones bajos, primera letra en mayúscula. */
function formatKey(key: string): string {
  const withSpaces = key.replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/** Formatea un valor primitivo para lectura humana (sin comillas ni llaves JSON). */
function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

/** Fila clave-valor; si el valor es un objeto o array, se renderiza anidado e indentado. */
function Entries({ data }: { data: PlainObject }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className={styles.empty}>Sin datos.</p>;
  }
  return (
    <ul className={styles.list}>
      {entries.map(([key, value]) => (
        <li key={key} className={styles.row}>
          <span className={styles.key}>{formatKey(key)}</span>
          {isNested(value) ? (
            <div className={styles.nested}>
              {Array.isArray(value) ? (
                <ArrayEntries data={value} />
              ) : (
                <Entries data={value as PlainObject} />
              )}
            </div>
          ) : (
            <span className={styles.value}>{formatPrimitive(value)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Lista de elementos de un array; cada elemento sigue el mismo criterio que una fila. */
function ArrayEntries({ data }: { data: unknown[] }) {
  if (data.length === 0) {
    return <p className={styles.empty}>Sin elementos.</p>;
  }
  return (
    <ul className={styles.list}>
      {data.map((item, index) => (
        <li key={index} className={styles.row}>
          {isNested(item) ? (
            <div className={styles.nested}>
              {Array.isArray(item) ? (
                <ArrayEntries data={item} />
              ) : (
                <Entries data={item as PlainObject} />
              )}
            </div>
          ) : (
            <span className={styles.value}>{formatPrimitive(item)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Renderiza cualquier estructura de datos (objeto, array o valor suelto) como
 * pares clave-valor legibles para personas, sin volcar JSON crudo.
 */
export function KeyValueView({ data }: { data: unknown }) {
  if (isPlainObject(data)) {
    return <Entries data={data} />;
  }
  if (Array.isArray(data)) {
    return <ArrayEntries data={data} />;
  }
  return <span className={styles.value}>{formatPrimitive(data)}</span>;
}
