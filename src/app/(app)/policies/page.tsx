import { PageHeader } from "@/components/app-shell/page-header";
import { PoliciesList } from "@/components/policies/policies-list";
import { getPolicies } from "@/data/policies";

export default async function PoliciesPage() {
  const policies = await getPolicies();

  return (
    <div>
      <PageHeader
        title="Políticas"
        description="Reglas que permiten, bloquean o exigen aprobación sobre las acciones de los agentes."
      />
      <PoliciesList policies={policies} />
    </div>
  );
}
