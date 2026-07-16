import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { AccessDenied } from "@/components/feedback/access-denied";
import { getUsers } from "@/data/users";
import { getTools } from "@/data/tools";
import { getCurrentUser } from "@/lib/session-db";
import { can } from "@/lib/permissions";

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  // Defensa en profundidad: el middleware ya debería haber redirigido, pero
  // un usuario desactivado a mitad de sesión llega hasta aquí.
  if (!currentUser) {
    redirect("/login");
  }

  if (!can(currentUser, "settings:manage")) {
    return (
      <div>
        <PageHeader
          title="Ajustes"
          description="Usuarios, roles y herramientas conectadas de la organización."
        />
        <AccessDenied description="Tu rol no permite gestionar los ajustes de la organización." />
      </div>
    );
  }

  const [users, tools] = await Promise.all([getUsers(), getTools()]);

  return (
    <div>
      <PageHeader
        title="Ajustes"
        description="Usuarios, roles y herramientas conectadas de la organización."
      />
      <SettingsPanel users={users} tools={tools} />
    </div>
  );
}
