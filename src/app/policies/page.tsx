import { PageHeader } from "@/components/app-shell/page-header";
import { PoliciesList } from "@/components/policies/policies-list";
import { policies } from "@/data/demo-data";

export default function PoliciesPage() {
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
