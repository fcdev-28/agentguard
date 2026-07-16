import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { getUsers } from "@/data/users";
import { getTools } from "@/data/tools";

export default async function SettingsPage() {
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
