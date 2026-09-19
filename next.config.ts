import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que `next dev` inyecte su bloque de reglas para agentes en CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
