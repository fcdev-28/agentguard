import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { PolicyForm } from "@/components/policies/policy-form";
import { getCurrentUser } from "@/lib/session-db";
import { can } from "@/lib/permissions";

export default async function NewPolicyPage() {
  const currentUser = await getCurrentUser();

  // Defensa en profundidad: el middleware ya debería haber redirigido, pero
  // un usuario desactivado a mitad de sesión llega hasta aquí.
  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div>
      <PageHeader
        title="Nueva política"
        description="Define las condiciones, el efecto y el SLA de aprobación. Nace en borrador."
      />
      <PolicyForm canWrite={can(currentUser, "policy:write")} />
    </div>
  );
}
