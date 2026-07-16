import { PageHeader } from "@/components/app-shell/page-header";
import { PolicyForm } from "@/components/policies/policy-form";

export default function NewPolicyPage() {
  return (
    <div>
      <PageHeader
        title="Nueva política"
        description="Define las condiciones, el efecto y el SLA de aprobación. Nace en borrador."
      />
      <PolicyForm />
    </div>
  );
}
