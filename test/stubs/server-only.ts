// Stub de "server-only" para Vitest.
// El paquete real lanza un error si se importa desde un módulo de cliente;
// esa comprobación depende del alias que aplica el bundler de Next.js en
// build (server vs cliente), que Vitest no reproduce. En los tests, que
// corren en entorno Node (equivalente a "servidor"), basta con un módulo
// vacío para que el `import "server-only";` no falle.
export {};
