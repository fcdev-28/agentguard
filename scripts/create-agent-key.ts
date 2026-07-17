// Uso: npx tsx scripts/create-agent-key.ts <agentId>
import { prisma } from "../src/lib/prisma";
import { generateApiKeyToken } from "../src/lib/auth/agent-keys";

async function main() {
  const agentId = process.argv[2];
  if (!agentId) {
    console.error("Uso: npx tsx scripts/create-agent-key.ts <agentId>");
    process.exit(1);
  }

  const { token, prefix, keyHash } = generateApiKeyToken();
  await prisma.agentApiKey.create({ data: { agentId, prefix, keyHash } });

  console.log(
    `API key para ${agentId} (guárdala, solo se muestra una vez):\n${token}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
