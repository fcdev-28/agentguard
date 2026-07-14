import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { users, tools } from "@/data/demo-data";

export default function SettingsPage() {
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
