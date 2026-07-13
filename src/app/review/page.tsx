import { PageHeader } from "@/components/app-shell/page-header";
import { ReviewScreen } from "@/components/review/review-screen";

export default function ReviewPage() {
  return (
    <div>
      <PageHeader
        title="Revisión"
        description="Cola priorizada de acciones que requieren decisión humana."
      />
      <ReviewScreen />
    </div>
  );
}
