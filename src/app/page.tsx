export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-8)",
        textAlign: "center",
      }}
    >
      <div
        style={{ maxWidth: "32rem", display: "grid", gap: "var(--space-3)" }}
      >
        <h1>AgentGuard</h1>
        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-16)" }}>
          Plano de control para agentes de IA. Base del proyecto lista; el
          shell, el dashboard y las pantallas operativas llegan en las
          siguientes fases.
        </p>
      </div>
    </main>
  );
}
