import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { PoliciesList } from "@/components/policies/policies-list";
import { getPolicies } from "@/data/policies";
import { getCurrentUser } from "@/lib/session-db";
import { can } from "@/lib/permissions";

export default async function PoliciesPage() {
  const [policies, currentUser] = await Promise.all([
    getPolicies(),
    getCurrentUser(),
  ]);

  // Defensa en profundidad: el middleware ya debería haber redirigido, pero
  // un usuario desactivado a mitad de sesión llega hasta aquí.
  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div>
      <PageHeader
        title="Políticas"
        description="Reglas que permiten, bloquean o exigen aprobación sobre las acciones de los agentes."
      />
      <PoliciesList
        policies={policies}
        canWrite={can(currentUser, "policy:write")}
      />
    </div>
  );
}
